/**
 * The freeze state of an article, and the freeze and unfreeze operations.
 *
 * All the logic of the `article/lock` HTTP handlers lives here. The handler
 * files contain only `handle`, because the build merges helper functions from
 * all the handler files of one scope into one bundle.
 *
 * The freeze state lives in four extension properties of the article:
 * `isLocked`, `lockedBy`, `lockedAt` and `version`. Only the POST handler
 * writes them. The workflow rule only reads `isLocked`.
 *
 * Words: a frozen article is read-only. An editable article is not frozen.
 * The user freezes and unfreezes an article.
 */
import type {
  Article as ArticleEntity,
  User as UserEntity
} from '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs';
import type { ArticleLockSettings } from './lock-settings';
import { parseLockSettings } from './lock-settings';
import type { ArticleUnlockRestriction } from './permissions';
import { canLockArticle, canUnlockArticle, hasProjectPermission, isProjectAdmin } from './permissions';

/** The freeze state of an article, flat, as the handlers send it. */
export type ArticleLockState = {
  isLocked: boolean;
  lockedByLogin: string;
  lockedByName: string;
  lockedByAvatarUrl: string;
  lockedAt: number;
  version: number;
  authorLogin: string;
  authorName: string;
  currentUserLogin: string;
  canEdit: boolean;
  canLock: boolean;
  canUnlock: boolean;
  enabled: boolean;
  unlockRestriction: ArticleUnlockRestriction;
  allowComments: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
  allowChildArticles: boolean;
};

/** The result of a freeze or an unfreeze request. */
export type ArticleLockResult = {
  ok: boolean;
  message: string;
  state: ArticleLockState;
};

/** A user, as far as this module reads it. */
type UserProbe = {
  login?: string;
  fullName?: string;
  visibleName?: string;
  avatarUrl?: string;
};

/** The extension properties of an article, without a fixed type. */
type Props = Record<string, unknown>;

function props(article: ArticleEntity): Props {
  return article.extensionProperties as unknown as Props;
}

/**
 * Reads the article settings of the project of the article.
 *
 * @param article The article.
 * @returns The article settings, with a default for each absent field.
 */
export function readArticleSettings(article: ArticleEntity): ArticleLockSettings {
  const project = article.project as unknown as { extensionProperties?: Props };
  const raw = project.extensionProperties ? project.extensionProperties.settings : undefined;
  return parseLockSettings(raw).article;
}

/**
 * Reads the user who froze the article.
 *
 * A reference to a removed user can throw. The function then returns null.
 */
function readLocker(article: ArticleEntity): UserProbe | null {
  try {
    const value = props(article).lockedBy;
    if (value && typeof value === 'object') {
      return value as UserProbe;
    }
  } catch (error) {
    console.warn('[lock] Cannot read lockedBy: ' + String(error));
  }
  return null;
}

function readNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
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

/**
 * Tells if a user can edit an article, as YouTrack sees it.
 *
 * YouTrack lets a user edit an article in three cases: the user is a project
 * admin, the user has `UPDATE_ARTICLE` in the project, or the user created
 * the article and has `CREATE_ARTICLE` in the project. The last case covers
 * an author who cannot edit the articles of other users.
 *
 * @param article The article.
 * @param user The user who asks.
 * @param isAdmin True if the user is a project admin.
 * @param isAuthor True if the user created the article.
 * @returns True if the user can edit the article.
 */
function canEditArticle(article: ArticleEntity, user: UserEntity, isAdmin: boolean, isAuthor: boolean): boolean {
  if (isAdmin) {
    return true;
  }
  if (hasProjectPermission(user, 'UPDATE_ARTICLE', article.project)) {
    return true;
  }
  return isAuthor && hasProjectPermission(user, 'CREATE_ARTICLE', article.project);
}

/**
 * Reads the freeze state of an article for the current user.
 *
 * @param article The article.
 * @param user The user who asks.
 * @returns The state, the settings, and what the user can do.
 */
export function readArticleLockState(article: ArticleEntity, user: UserEntity): ArticleLockState {
  const settings = readArticleSettings(article);
  const p = props(article);
  const locker = readLocker(article);
  const author = article.author as unknown as UserProbe | null;
  const me = user as unknown as UserProbe;

  const isAdmin = isProjectAdmin(user, article.project);
  const isAuthor = !!author && !!author.login && author.login === me.login;
  const isLocker = !!locker && !!locker.login && locker.login === me.login;
  const canEdit = canEditArticle(article, user, isAdmin, isAuthor);
  const isLocked = p.isLocked === true;

  return {
    isLocked,
    lockedByLogin: loginOf(locker),
    lockedByName: nameOf(locker),
    lockedByAvatarUrl: locker && locker.avatarUrl ? locker.avatarUrl : '',
    lockedAt: readNumber(p.lockedAt),
    version: readNumber(p.version),
    authorLogin: loginOf(author),
    authorName: nameOf(author),
    currentUserLogin: me.login || '',
    canEdit,
    canLock: !isLocked && settings.enabled && canEdit &&
      canLockArticle(settings.unlockRestriction, { isAdmin, isAuthor }),
    canUnlock: isLocked && canEdit &&
      canUnlockArticle(settings.unlockRestriction, { isAdmin, isAuthor, isLocker }),
    enabled: settings.enabled,
    unlockRestriction: settings.unlockRestriction,
    allowComments: settings.allowComments,
    allowAttachments: settings.allowAttachments,
    allowTags: settings.allowTags,
    allowChildArticles: settings.allowChildArticles
  };
}

/**
 * Tells who can unfreeze an article, in one sentence, for a message.
 */
function unlockRule(restriction: ArticleUnlockRestriction): string {
  if (restriction === 'author') {
    return 'Only the author or a project admin can unfreeze this article.';
  }
  if (restriction === 'lockedBy') {
    return 'Only the user who froze the article or a project admin can unfreeze it.';
  }
  if (restriction === 'authorOrLockedBy') {
    return 'Only the author, the user who froze the article or a project admin can unfreeze it.';
  }
  if (restriction === 'projectAdmins') {
    return 'Only a project admin can unfreeze this article.';
  }
  return 'Each user who can edit this article can unfreeze it.';
}

/**
 * Freezes an article. The article becomes read-only.
 *
 * The function does not throw. A request that the rules reject gives
 * `ok: false` and a message for the user.
 *
 * @param article The article.
 * @param user The user who freezes.
 * @returns The result and the new state.
 */
export function lockArticle(article: ArticleEntity, user: UserEntity): ArticleLockResult {
  const before = readArticleLockState(article, user);
  if (before.isLocked) {
    return { ok: false, message: 'The article is frozen already.', state: before };
  }
  if (!before.enabled) {
    return { ok: false, message: 'The lock for articles is off in this project.', state: before };
  }
  if (!before.canEdit) {
    return { ok: false, message: 'You cannot edit this article, so you cannot freeze it.', state: before };
  }
  if (!before.canLock) {
    return {
      ok: false,
      message: 'You cannot freeze this article, because you could not unfreeze it. ' +
        unlockRule(before.unlockRestriction),
      state: before
    };
  }
  try {
    const p = props(article);
    p.isLocked = true;
    p.lockedBy = user;
    p.lockedAt = Date.now();
    // This counter is the `version` property of the article. It is not the
    // version of the settings format.
    p.version = readNumber(p.version) + 1;
  } catch (error) {
    return {
      ok: false,
      message: 'The app cannot freeze the article: ' + String(error),
      state: readArticleLockState(article, user)
    };
  }
  return { ok: true, message: 'The article is frozen.', state: readArticleLockState(article, user) };
}

/**
 * Unfreezes an article. The article becomes editable again.
 *
 * Unfreeze works also when the lock for articles is off in the project, so
 * that a frozen article can always become editable.
 *
 * @param article The article.
 * @param user The user who unfreezes.
 * @returns The result and the new state.
 */
export function unlockArticle(article: ArticleEntity, user: UserEntity): ArticleLockResult {
  const before = readArticleLockState(article, user);
  if (!before.isLocked) {
    return { ok: false, message: 'The article is editable already.', state: before };
  }
  if (!before.canEdit) {
    return { ok: false, message: 'You cannot edit this article, so you cannot unfreeze it.', state: before };
  }
  if (!before.canUnlock) {
    return {
      ok: false,
      message: 'You cannot unfreeze this article. ' + unlockRule(before.unlockRestriction),
      state: before
    };
  }
  try {
    const p = props(article);
    p.isLocked = false;
    p.lockedBy = null;
    p.lockedAt = null;
  } catch (error) {
    return {
      ok: false,
      message: 'The app cannot unfreeze the article: ' + String(error),
      state: readArticleLockState(article, user)
    };
  }
  return { ok: true, message: 'The article is editable.', state: readArticleLockState(article, user) };
}
