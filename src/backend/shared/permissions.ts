/**
 * Permission checks that the workflow rules and the HTTP handlers share.
 *
 * This module must not import anything. The build puts it in a shared chunk
 * that the rules and the handlers load at run time.
 */

/** The users who can move a locked ticket back to an unresolved state. */
export type TicketUnlockRestriction = "anyone" | "reporter" | "projectAdmins";

/** The users who can unfreeze a frozen article. */
export type ArticleUnlockRestriction =
  | "anyone"
  | "author"
  | "lockedBy"
  | "authorOrLockedBy"
  | "projectAdmins";

/** The facts about the current user that decide an unfreeze request. */
export type UnlockFacts = {
  isAdmin: boolean;
  isAuthor: boolean;
  /** True if the current user is the user who froze the article. */
  isLocker: boolean;
};

/** The facts about the current user that decide a freeze request. */
export type LockFacts = {
  isAdmin: boolean;
  isAuthor: boolean;
};

/** A user that can possibly answer a permission question. */
type PermissionProbe = {
  login: string;
  hasPermission?: (permissionKey: string, project: unknown) => boolean;
  hasRole?: (roleName: string, project: unknown) => boolean;
};

/** A project that possibly has a leader. */
type LeaderProbe = {
  leader?: { login?: string } | null;
};

/**
 * Tells if a user is an administrator of a project.
 *
 * The function uses `hasPermission` first. YouTrack added that method in
 * version 2025.3. On an older instance the function uses the role name and
 * the project leader.
 *
 * @param user The user to check.
 * @param project The project to check.
 * @returns True if the user is a project admin.
 */
export function isProjectAdmin(user: unknown, project: unknown): boolean {
  const probe = user as PermissionProbe;
  try {
    if (typeof probe.hasPermission === 'function') {
      return probe.hasPermission('UPDATE_PROJECT', project);
    }
  } catch (error) {
    console.warn('[lock] hasPermission failed: ' + String(error));
  }
  try {
    if (typeof probe.hasRole === 'function' && probe.hasRole('Project Admin', project)) {
      return true;
    }
  } catch (error) {
    console.warn('[lock] hasRole failed: ' + String(error));
  }
  const leader = (project as LeaderProbe).leader;
  return !!leader && !!leader.login && leader.login === probe.login;
}

/**
 * Tells if a user has a permission in a project.
 *
 * @param user The user to check.
 * @param permissionKey The permission key, for example `UPDATE_ARTICLE`.
 * @param project The project to check.
 * @returns True if the user has the permission. False if YouTrack cannot tell.
 */
export function hasProjectPermission(user: unknown, permissionKey: string, project: unknown): boolean {
  const probe = user as PermissionProbe;
  try {
    if (typeof probe.hasPermission === 'function') {
      return probe.hasPermission(permissionKey, project);
    }
  } catch (error) {
    console.warn('[lock] hasPermission failed: ' + String(error));
  }
  return false;
}

/**
 * Tells if a user can unfreeze a frozen article.
 *
 * A project admin can always unfreeze. If the app does not know who froze the
 * article, the check fails closed: under `lockedBy` only an admin can
 * unfreeze, and under `authorOrLockedBy` only the author or an admin.
 *
 * @param restriction The setting of the project.
 * @param facts The facts about the user.
 * @returns True if the user can unfreeze the article.
 */
export function canUnlockArticle(restriction: ArticleUnlockRestriction, facts: UnlockFacts): boolean {
  if (facts.isAdmin) {
    return true;
  }
  if (restriction === 'anyone') {
    return true;
  }
  if (restriction === 'author') {
    return facts.isAuthor;
  }
  if (restriction === 'lockedBy') {
    return facts.isLocker;
  }
  if (restriction === 'authorOrLockedBy') {
    return facts.isAuthor || facts.isLocker;
  }
  return false;
}

/**
 * Tells if a user can freeze an editable article.
 *
 * A user can freeze only if the same user could also unfreeze the article
 * afterwards. The check treats the user as the future locker.
 *
 * @param restriction The setting of the project.
 * @param facts The facts about the user.
 * @returns True if the user can freeze the article.
 */
export function canLockArticle(restriction: ArticleUnlockRestriction, facts: LockFacts): boolean {
  return canUnlockArticle(restriction, {
    isAdmin: facts.isAdmin,
    isAuthor: facts.isAuthor,
    isLocker: true
  });
}

/**
 * Tells if a user can move a locked ticket back to an unresolved state.
 *
 * A project admin can always reopen a ticket.
 *
 * @param restriction The setting of the project.
 * @param isAdmin True if the user is a project admin.
 * @param isReporter True if the user created the ticket.
 * @returns True if the user can reopen the ticket.
 */
export function canReopenTicket(
  restriction: TicketUnlockRestriction,
  isAdmin: boolean,
  isReporter: boolean
): boolean {
  if (isAdmin) {
    return true;
  }
  if (restriction === 'anyone') {
    return true;
  }
  if (restriction === 'reporter') {
    return isReporter;
  }
  return false;
}
