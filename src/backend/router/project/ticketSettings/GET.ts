import { withPermissions } from '@jetbrains/youtrack-apps-tools/dx/runtime';
import { readProjectLockSettings } from '@/backend/shared/lock-settings';

/**
 * @zod-to-schema
 */
export type TicketSettingsReq = {
  projectId: string;
};

/**
 * @zod-to-schema
 */
export type TicketSettingsRes = {
  enabled: boolean;
  unlockRestriction: "anyone" | "reporter" | "resolver" | "reporterOrResolver" | "projectAdmins";
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
};

/**
 * Reads the ticket lock settings of the project.
 *
 * The client sends `projectId` to select the project, then removes it before
 * the request comes to this handler. Use `ctx.project`.
 */
function handle(ctx: CtxGet<TicketSettingsRes, TicketSettingsReq, "project">): void {
  ctx.response.json(readProjectLockSettings(ctx.project).ticket);
}

export default withPermissions(handle, ['UPDATE_PROJECT']);
export type Handle = typeof handle;
