import { withPermissions } from '@jetbrains/youtrack-apps-tools/dx/runtime';
import { readTicketLockState } from '@/backend/shared/ticket-lock';

/**
 * @zod-to-schema
 */
export type TicketLockReq = {
  refresh?: boolean;
};

/**
 * @zod-to-schema
 */
export type TicketLockRes = {
  isResolved: boolean;
  enabled: boolean;
  unlockRestriction: "anyone" | "reporter" | "projectAdmins";
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

/**
 * Reads the lock state of the ticket for the current user.
 *
 * YouTrack gives the ticket from the widget context. The handler does not
 * write anything: YouTrack rejects a GET handler that writes.
 */
function handle(ctx: CtxGet<TicketLockRes, TicketLockReq, "issue">): void {
  ctx.response.json(readTicketLockState(ctx.issue, ctx.currentUser));
}

export default withPermissions(handle, ['READ_ISSUE']);
export type Handle = typeof handle;
