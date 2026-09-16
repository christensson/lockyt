/**
 * The lock state of a ticket, as the `issue/lock` HTTP handler sends it, and
 * the facts that decide who can reopen a ticket.
 *
 * The handler file contains only `handle`, because the build merges helper
 * functions from all the handler files of one scope into one bundle. The
 * workflow rule that locks a ticket uses `ticketUnlockFacts` too, so that the
 * rule and the widget never disagree about who can reopen.
 *
 * The rule `record-ticket-resolver` writes the `resolvedBy` and `resolvedAt`
 * extension properties of the ticket. This module only reads them.
 */
import type {
  Issue as IssueEntity,
  User as UserEntity
} from '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs';
import { readProjectLockSettings } from './lock-settings';
import type { TicketUnlockFacts, TicketUnlockRestriction } from './permissions';
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
  resolverLogin: string;
  resolverName: string;
  resolvedAt: number;
  currentUserLogin: string;
  canReopen: boolean;
};

/** A user, as far as this module reads it. */
type UserProbe = {
  login?: string;
  fullName?: string;
  visibleName?: string;
};

/** The extension properties of a ticket, without a fixed type. */
type Props = Record<string, unknown>;

function props(issue: IssueEntity): Props {
  return issue.extensionProperties as unknown as Props;
}

function loginOf(user: UserProbe | null): string {
  return user && user.login ? user.login : '';
}

function nameOf(user: UserProbe | null): string {
  if (!user) {
    return '';
  }
  return user.fullName || user.visibleName || user.login || '';
}

function readNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

/**
 * Reads the user who resolved the ticket.
 *
 * A reference to a removed user can throw. The function then returns null.
 *
 * @param issue The ticket.
 * @returns The user, or null if the app does not know.
 */
export function readTicketResolver(issue: IssueEntity): UserProbe | null {
  try {
    const value = props(issue).resolvedBy;
    if (value && typeof value === 'object') {
      return value as UserProbe;
    }
  } catch (error) {
    console.warn('[ticket-lock] Cannot read resolvedBy: ' + String(error));
  }
  return null;
}

/**
 * Reads the moment when the ticket became resolved, as the app recorded it.
 *
 * @param issue The ticket.
 * @returns Milliseconds since 1970-01-01T00:00Z, or 0 if the app does not know.
 */
export function readTicketResolvedAt(issue: IssueEntity): number {
  try {
    return readNumber(props(issue).resolvedAt);
  } catch (error) {
    console.warn('[ticket-lock] Cannot read resolvedAt: ' + String(error));
    return 0;
  }
}

/**
 * Collects the facts about a user that decide if the user can reopen a ticket.
 *
 * @param issue The ticket.
 * @param user The user who asks, or who makes the change.
 * @returns The facts.
 */
export function ticketUnlockFacts(issue: IssueEntity, user: UserEntity): TicketUnlockFacts {
  const reporter = issue.reporter as unknown as UserProbe | null;
  const resolver = readTicketResolver(issue);
  const me = user as unknown as UserProbe;
  return {
    isAdmin: isProjectAdmin(user, issue.project),
    isReporter: !!reporter && !!reporter.login && reporter.login === me.login,
    isResolver: !!resolver && !!resolver.login && resolver.login === me.login
  };
}

/**
 * Tells who can reopen a locked ticket, in one sentence, for a message.
 *
 * @param restriction The setting of the project.
 * @returns One sentence.
 */
export function reopenRule(restriction: TicketUnlockRestriction): string {
  if (restriction === 'reporter') {
    return 'Only the reporter or a project admin can reopen this ticket.';
  }
  if (restriction === 'resolver') {
    return 'Only the user who resolved the ticket or a project admin can reopen it.';
  }
  if (restriction === 'reporterOrResolver') {
    return 'Only the reporter, the user who resolved the ticket or a project admin can reopen it.';
  }
  if (restriction === 'projectAdmins') {
    return 'Only a project admin can reopen this ticket.';
  }
  return 'Each user who can update this ticket can reopen it.';
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
  const resolver = readTicketResolver(issue);
  const me = user as unknown as UserProbe;

  return {
    isResolved: issue.isResolved,
    enabled: settings.enabled,
    unlockRestriction: settings.unlockRestriction,
    allowComments: settings.allowComments,
    allowLinks: settings.allowLinks,
    allowWorkItems: settings.allowWorkItems,
    allowAttachments: settings.allowAttachments,
    allowTags: settings.allowTags,
    reporterLogin: loginOf(reporter),
    reporterName: nameOf(reporter),
    resolverLogin: loginOf(resolver),
    resolverName: nameOf(resolver),
    resolvedAt: readTicketResolvedAt(issue),
    currentUserLogin: me.login || '',
    canReopen: canReopenTicket(settings.unlockRestriction, ticketUnlockFacts(issue, user))
  };
}
