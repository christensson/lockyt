import { withPermissions } from '@jetbrains/youtrack-apps-tools/dx/runtime';
import { readIssueLockState } from '@/backend/shared/issue-lock';

/**
 * @zod-to-schema
 */
export type IssueLockReq = {
  refresh?: boolean;
};

/**
 * @zod-to-schema
 */
export type IssueLockRes = {
  isResolved: boolean;
  enabled: boolean;
  unlockRestriction: "anyone" | "reporter" | "resolver" | "reporterOrResolver" | "projectAdmins";
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

/**
 * Reads the lock state of the issue for the current user.
 *
 * YouTrack gives the issue from the widget context. The handler does not
 * write anything: YouTrack rejects a GET handler that writes.
 */
function handle(ctx: CtxGet<IssueLockRes, IssueLockReq, "issue">): void {
  ctx.response.json(readIssueLockState(ctx.issue, ctx.currentUser));
}

export default withPermissions(handle, ['READ_ISSUE']);
export type Handle = typeof handle;
