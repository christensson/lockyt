/**
 * The lock state of a ticket, as the `issue/lock` HTTP handler sends it.
 *
 * The handler file contains only `handle`, because the build merges helper
 * functions from all the handler files of one scope into one bundle.
 */
import type {
  Issue as IssueEntity,
  User as UserEntity
} from '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs';
import { readProjectLockSettings } from './lock-settings';
import type { TicketUnlockRestriction } from './permissions';
import { canReopenTicket, isProjectAdmin } from './permissions';

/** The lock state of a ticket, flat. */
export type TicketLockState = {
  isResolved: boolean;
  enabled: boolean;
  unlockRestriction: TicketUnlockRestriction;
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
  reporterLogin: string;
  reporterName: string;
  currentUserLogin: string;
  canReopen: boolean;
};

/** A user, as far as this module reads it. */
type UserProbe = {
  login?: string;
  fullName?: string;
  visibleName?: string;
};

function nameOf(user: UserProbe | null): string {
  if (!user) {
    return '';
  }
  return user.fullName || user.visibleName || user.login || '';
}

/**
 * Reads the lock state of a ticket for the current user.
 *
 * @param issue The ticket.
 * @param user The user who asks.
 * @returns The state, the settings, and if the user can reopen the ticket.
 */
export function readTicketLockState(issue: IssueEntity, user: UserEntity): TicketLockState {
  const settings = readProjectLockSettings(issue.project).ticket;
  const reporter = issue.reporter as unknown as UserProbe | null;
  const me = user as unknown as UserProbe;
  const isReporter = !!reporter && !!reporter.login && reporter.login === me.login;
  const isAdmin = isProjectAdmin(user, issue.project);

  return {
    isResolved: issue.isResolved,
    enabled: settings.enabled,
    unlockRestriction: settings.unlockRestriction,
    allowComments: settings.allowComments,
    allowLinks: settings.allowLinks,
    allowWorkItems: settings.allowWorkItems,
    allowAttachments: settings.allowAttachments,
    allowTags: settings.allowTags,
    reporterLogin: reporter && reporter.login ? reporter.login : '',
    reporterName: nameOf(reporter),
    currentUserLogin: me.login || '',
    canReopen: canReopenTicket(settings.unlockRestriction, isAdmin, isReporter)
  };
}
