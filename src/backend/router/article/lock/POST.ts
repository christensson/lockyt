import { withPermissions } from '@jetbrains/youtrack-apps-tools/dx/runtime';
import { lockArticle, unlockArticle } from '@/backend/shared/article-lock';

/**
 * @zod-to-schema
 */
export type SetArticleLockReq = {
  locked: boolean;
};

/**
 * @zod-to-schema
 */
export type SetArticleLockRes = {
  ok: boolean;
  message: string;
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
};

/**
 * Freezes or unfreezes the article.
 *
 * A request that the rules reject gives code 200 with `ok: false` and a
 * message, so that the widget can show the message.
 */
function handle(ctx: CtxPost<SetArticleLockReq, SetArticleLockRes, never, "article">): void {
  const body = ctx.request.json();
  const result = body.locked
    ? lockArticle(ctx.article, ctx.currentUser)
    : unlockArticle(ctx.article, ctx.currentUser);
  ctx.response.json({ ok: result.ok, message: result.message, ...result.state });
}

export default withPermissions(handle, ['UPDATE_ARTICLE']);
export type Handle = typeof handle;
