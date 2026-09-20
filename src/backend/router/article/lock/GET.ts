import { withPermissions } from '@jetbrains/youtrack-apps-tools/dx/runtime';
import { readArticleLockState } from '@/backend/shared/article-lock';

/**
 * @zod-to-schema
 */
export type ArticleLockReq = {
  refresh?: boolean;
};

/**
 * @zod-to-schema
 */
export type ArticleLockRes = {
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
  unlockRestriction: "anyone" | "author" | "lockedBy" | "authorOrLockedBy" | "projectAdmins";
  allowComments: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
  allowChildArticles: boolean;
  allowDelete: boolean;
};

/**
 * Reads the freeze state of the article for the current user.
 *
 * YouTrack gives the article from the widget context. The handler does not
 * write anything: YouTrack rejects a GET handler that writes.
 */
function handle(ctx: CtxGet<ArticleLockRes, ArticleLockReq, "article">): void {
  ctx.response.json(readArticleLockState(ctx.article, ctx.currentUser));
}

export default withPermissions(handle, ['READ_ARTICLE']);
export type Handle = typeof handle;
