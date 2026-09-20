/**
 * The lock state of an issue, as the `issue/lock` HTTP handler sends it, and
 * the facts that decide who can reopen an issue.
 *
 * The handler file contains only `handle`, because the build merges helper
 * functions from all the handler files of one scope into one bundle. The
 * workflow rule that locks an issue uses `issueUnlockFacts` too, so that the
 * rule and the widget never disagree about who can reopen.
 *
 * The rule `record-issue-resolver` writes the `resolvedBy` and `resolvedAt`
 * extension properties of the issue. This module only reads them.
 */
import type {
  Issue as IssueEntity,
  User as UserEntity
} from '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs';
import { readProjectLockSettings } from './lock-settings';
import type { IssueUnlockFacts, IssueUnlockRestriction } from './permissions';
import { canReopenIssue, isProjectAdmin } from './permissions';

/** The lock state of an issue, flat. */
export type IssueLockState = {
  isResolved: boolean;
  enabled: boolean;
  unlockRestriction: IssueUnlockRestriction;
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
  allowDelete: boolean;
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

/** The extension properties of an issue, without a fixed type. */
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
 * Reads the user who resolved the issue.
 *
 * A reference to a removed user can throw. The function then returns null.
 *
 * @param issue The issue.
 * @returns The user, or null if the app does not know.
 */
export function readIssueResolver(issue: IssueEntity): UserProbe | null {
  try {
    const value = props(issue).resolvedBy;
    if (value && typeof value === 'object') {
      return value as UserProbe;
    }
  } catch (error) {
    console.warn('[issue-lock] Cannot read resolvedBy: ' + String(error));
  }
  return null;
}

/**
 * Reads the moment when the issue became resolved, as the app recorded it.
 *
 * @param issue The issue.
 * @returns Milliseconds since 1970-01-01T00:00Z, or 0 if the app does not know.
 */
export function readIssueResolvedAt(issue: IssueEntity): number {
  try {
    return readNumber(props(issue).resolvedAt);
  } catch (error) {
    console.warn('[issue-lock] Cannot read resolvedAt: ' + String(error));
    return 0;
  }
}

/**
 * Collects the facts about a user that decide if the user can reopen an issue.
 *
 * @param issue The issue.
 * @param user The user who asks, or who makes the change.
 * @returns The facts.
 */
export function issueUnlockFacts(issue: IssueEntity, user: UserEntity): IssueUnlockFacts {
  const reporter = issue.reporter as unknown as UserProbe | null;
  const resolver = readIssueResolver(issue);
  const me = user as unknown as UserProbe;
  return {
    isAdmin: isProjectAdmin(user, issue.project),
    isReporter: !!reporter && !!reporter.login && reporter.login === me.login,
    isResolver: !!resolver && !!resolver.login && resolver.login === me.login
  };
}

/**
 * Tells who can reopen a locked issue, in one sentence, for a message.
 *
 * @param restriction The setting of the project.
 * @returns One sentence.
 */
export function reopenRule(restriction: IssueUnlockRestriction): string {
  if (restriction === 'reporter') {
    return 'Only the reporter or a project admin can reopen this issue.';
  }
  if (restriction === 'resolver') {
    return 'Only the user who resolved the issue or a project admin can reopen it.';
  }
  if (restriction === 'reporterOrResolver') {
    return 'Only the reporter, the user who resolved the issue or a project admin can reopen it.';
  }
  if (restriction === 'projectAdmins') {
    return 'Only a project admin can reopen this issue.';
  }
  return 'Each user who can update this issue can reopen it.';
}

/**
 * Reads the lock state of an issue for the current user.
 *
 * @param issue The issue.
 * @param user The user who asks.
 * @returns The state, the settings, and if the user can reopen the issue.
 */
export function readIssueLockState(issue: IssueEntity, user: UserEntity): IssueLockState {
  const settings = readProjectLockSettings(issue.project).issue;
  const reporter = issue.reporter as unknown as UserProbe | null;
  const resolver = readIssueResolver(issue);
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
    allowDelete: settings.allowDelete,
    reporterLogin: loginOf(reporter),
    reporterName: nameOf(reporter),
    resolverLogin: loginOf(resolver),
    resolverName: nameOf(resolver),
    resolvedAt: readIssueResolvedAt(issue),
    currentUserLogin: me.login || '',
    canReopen: canReopenIssue(settings.unlockRestriction, issueUnlockFacts(issue, user))
  };
}
