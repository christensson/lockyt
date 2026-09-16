import { Issue } from '@jetbrains/youtrack-scripting-api/entities';
import { check } from '@jetbrains/youtrack-scripting-api/workflow';
import type {
  Issue as IssueEntity,
  Project as ProjectEntity,
  User as UserEntity
} from '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs';
import { readProjectLockSettings } from '../backend/shared/lock-settings';
import type { TicketLockSettings } from '../backend/shared/lock-settings';
import { canReopenTicket } from '../backend/shared/permissions';
import { reopenRule, ticketUnlockFacts } from '../backend/shared/ticket-lock';
import { requirements } from '../backend/requirements';

/**
 * Locks a ticket that is resolved.
 *
 * The rule rejects each change to a locked ticket. The one permitted change
 * is to reopen the ticket. The settings of the project tell which users can
 * reopen a ticket, and which changes stay permitted while the ticket is
 * locked.
 */

/** The data type name of a period field, for example "Spent time". */
const PERIOD_TYPE = 'period';

/** One custom field that changes in the transaction. */
type ChangedField = {
  name: string;
  typeName: string;
};

/** The changes that the rule found in the transaction. */
type ChangeSet = {
  fields: string[];
  resolvingField: string | null;
  parts: string[];
};

/**
 * Reads the ticket lock settings of a project.
 *
 * @param project The project that holds the settings.
 * @returns The settings, with a default for each field that is absent.
 */
function readSettings(project: ProjectEntity): TicketLockSettings {
  return readProjectLockSettings(project).ticket;
}

/**
 * Tells if the ticket was locked before the transaction.
 *
 * A ticket that becomes resolved in this transaction is not locked yet. That
 * transaction must pass.
 *
 * @param issue The ticket that changes.
 * @returns True if the ticket was resolved before the transaction.
 */
function wasLocked(issue: IssueEntity): boolean {
  return issue.becomesUnresolved || (issue.isResolved && !issue.becomesResolved);
}

/**
 * Tells if a value is a state that YouTrack considers resolved.
 *
 * @param value The old value of a custom field.
 * @returns True if the value has a true `isResolved` property.
 */
function isResolvedValue(value: unknown): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const probe = value as { isResolved?: unknown };
  return probe.isResolved === true;
}

/**
 * Finds each custom field that changes in the transaction.
 *
 * The function also finds the field that held the ticket in a resolved
 * state. It does not use the name `State`, because a project can use a
 * different field.
 *
 * @param issue The ticket that changes.
 * @param project The project that holds the fields.
 * @returns The names of the changed fields and the name of the resolving field.
 */
function collectChangedFields(
  issue: IssueEntity,
  project: ProjectEntity
): { fields: ChangedField[]; resolvingField: string | null } {
  const fields: ChangedField[] = [];
  let resolvingField: string | null = null;

  project.fields.forEach(field => {
    const name = field.name;
    if (!issue.fields.isChanged(name)) {
      return;
    }
    fields.push({ name, typeName: field.typeName });
    // Read the old value only after isChanged, because Fields.oldValue gives
    // the current value when the field does not change.
    if (isResolvedValue(issue.fields.oldValue(name))) {
      resolvingField = name;
    }
  });

  return { fields, resolvingField };
}

/**
 * Finds each link type that changes in the transaction.
 *
 * @param issue The ticket that changes.
 * @returns The names of the link types that change.
 */
function collectChangedLinks(issue: IssueEntity): string[] {
  const changed: string[] = [];
  try {
    const links = issue.links;
    const names = Object.keys(links);
    if (names.length === 0) {
      console.warn('[ticket-lock] The ticket gave no link types.');
    }
    for (let i = 0; i < names.length; i++) {
      const set = links[names[i]];
      if (!set) {
        continue;
      }
      const added = set.added;
      const removed = set.removed;
      if ((added && added.isNotEmpty()) || (removed && removed.isNotEmpty())) {
        changed.push(names[i]);
      }
    }
  } catch (error) {
    console.warn('[ticket-lock] The rule cannot read the links: ' + String(error));
  }
  return changed;
}

/**
 * Finds each change that the settings do not permit.
 *
 * The function does not look at the custom fields. Use
 * `collectChangedFields` for the fields.
 *
 * @param issue The ticket that changes.
 * @param settings The settings of the project.
 * @returns The names of the changes that the settings do not permit.
 */
function collectBlockedParts(issue: IssueEntity, settings: TicketLockSettings): string[] {
  const blocked: string[] = [];

  if (issue.isChanged('summary')) {
    blocked.push('summary');
  }
  if (issue.isChanged('description')) {
    blocked.push('description');
  }
  if (!settings.allowComments && (issue.comments.isChanged || issue.editedComments.isNotEmpty())) {
    blocked.push('comments');
  }
  if (!settings.allowAttachments && issue.attachments.isChanged) {
    blocked.push('attachments');
  }
  if (!settings.allowTags && issue.tags.isChanged) {
    blocked.push('tags');
  }
  if (!settings.allowWorkItems && workItemsChanged(issue)) {
    blocked.push('work items');
  }
  if (!settings.allowLinks && collectChangedLinks(issue).length > 0) {
    blocked.push('links');
  }

  return blocked;
}

/**
 * Tells if a user can reopen a locked ticket.
 *
 * A project admin can always reopen a ticket. The facts come from the same
 * function that the status widget uses.
 *
 * @param settings The settings of the project.
 * @param user The user that makes the change.
 * @param issue The ticket that changes.
 * @returns True if the user can reopen the ticket.
 */
function canReopen(settings: TicketLockSettings, user: UserEntity, issue: IssueEntity): boolean {
  return canReopenTicket(settings.unlockRestriction, ticketUnlockFacts(issue, user));
}

/**
 * Makes the text that tells the user why the rule rejects the change.
 *
 * A change from one resolved state to a different resolved state keeps the
 * ticket locked. The message tells the user the two steps to do instead.
 *
 * @param issue The ticket that changes.
 * @param changes The changes in the transaction.
 * @returns The message for the user.
 */
function blockMessage(issue: IssueEntity, changes: ChangeSet): string {
  const blocked = changes.fields.concat(changes.parts);
  let text = 'Ticket ' + issue.id + ' is resolved and locked. You cannot change these: ' +
    blocked.join(', ') + '. Reopen the ticket first.';
  if (changes.resolvingField !== null) {
    text += ' To change the resolution, reopen the ticket, then resolve it again.';
  }
  return text;
}

/**
 * Tells if the transaction adds, changes or removes a work item.
 *
 * @param issue The ticket that changes.
 * @returns True if a work item changes.
 */
function workItemsChanged(issue: IssueEntity): boolean {
  return issue.workItems.isChanged || issue.editedWorkItems.isNotEmpty();
}

/**
 * Collects all the changes in the transaction.
 *
 * YouTrack calculates the spent time from the work items. When a user adds a
 * work item, YouTrack also changes that period field. If the settings permit
 * a work item, the rule must not reject that field.
 *
 * Note: a project can have more than one period field, for example an
 * estimation. The rule cannot tell which period field YouTrack calculates, so
 * it lets each period field through in this one case.
 *
 * @param issue The ticket that changes.
 * @param project The project that holds the settings.
 * @param settings The settings of the project.
 * @returns The changed fields, the resolving field and the blocked parts.
 */
function collectChanges(
  issue: IssueEntity,
  project: ProjectEntity,
  settings: TicketLockSettings
): ChangeSet {
  const found = collectChangedFields(issue, project);
  const keepPeriod = settings.allowWorkItems && workItemsChanged(issue);
  const names: string[] = [];
  for (let i = 0; i < found.fields.length; i++) {
    const field = found.fields[i];
    if (keepPeriod && field.typeName === PERIOD_TYPE) {
      continue;
    }
    names.push(field.name);
  }
  return {
    fields: names,
    resolvingField: found.resolvingField,
    parts: collectBlockedParts(issue, settings)
  };
}

/**
 * Checks a transaction that reopens a locked ticket.
 *
 * The reopen must be alone. The transaction can change the resolving field
 * and the parts that the settings permit. It cannot change another field.
 *
 * @param issue The ticket that changes.
 * @param settings The settings of the project.
 * @param user The user that makes the change.
 * @param changes The changes in the transaction.
 */
function checkReopen(
  issue: IssueEntity,
  settings: TicketLockSettings,
  user: UserEntity,
  changes: ChangeSet
): void {
  check(
    canReopen(settings, user, issue),
    'You cannot reopen ticket ' + issue.id + '. ' + reopenRule(settings.unlockRestriction)
  );

  const extraFields = changes.fields.filter(name => name !== changes.resolvingField);
  const extra = extraFields.concat(changes.parts);
  check(
    extra.length === 0,
    'Reopen ticket ' + issue.id + ' alone. Remove these changes: ' + extra.join(', ') +
      '. Then edit the ticket.'
  );
}

export const rule = Issue.onChange({
  title: 'Lock a resolved ticket',

  guard(ctx) {
    const issue = ctx.issue;
    if (issue.isNew || issue.becomesRemoved || !issue.isReported) {
      return false;
    }
    // The rule cannot control a move. YouTrack uses the rules of the
    // destination project, and that project can have no lock. See the README.
    if (issue.isChanged('project')) {
      return false;
    }
    if (!wasLocked(issue)) {
      return false;
    }
    return readSettings(issue.project).enabled;
  },

  action(ctx) {
    const issue = ctx.issue;
    const project = issue.project;
    const settings = readSettings(project);
    const changes = collectChanges(issue, project, settings);

    if (issue.becomesUnresolved) {
      checkReopen(issue, settings, ctx.currentUser, changes);
      return;
    }

    const blockedCount = changes.fields.length + changes.parts.length;
    check(blockedCount === 0, blockMessage(issue, changes));
  },

  requirements
});
