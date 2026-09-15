import { withPermissions } from '@jetbrains/youtrack-apps-tools/dx/runtime';
import { readProjectLockSettings } from '@/backend/shared/lock-settings';

/**
 * @zod-to-schema
 */
export type ArticleSettingsReq = {
  projectId: string;
};

/**
 * @zod-to-schema
 */
export type ArticleSettingsRes = {
  enabled: boolean;
  unlockRestriction: "anyone" | "author" | "lockedBy" | "authorOrLockedBy" | "projectAdmins";
  allowComments: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
  allowChildArticles: boolean;
};

/**
 * Reads the article lock settings of the project.
 *
 * The client sends `projectId` to select the project, then removes it before
 * the request comes to this handler. Use `ctx.project`.
 */
function handle(ctx: CtxGet<ArticleSettingsRes, ArticleSettingsReq, "project">): void {
  ctx.response.json(readProjectLockSettings(ctx.project).article);
}

export default withPermissions(handle, ['UPDATE_PROJECT']);
export type Handle = typeof handle;
