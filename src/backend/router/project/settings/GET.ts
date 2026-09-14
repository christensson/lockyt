import { withPermissions } from '@jetbrains/youtrack-apps-tools/dx/runtime';
import { parseSettings } from '@/backend/shared/ticket-lock-settings';

/**
 * @zod-to-schema
 */
export type ProjectSettingsReq = {
  projectId: string;
};

/**
 * @zod-to-schema
 */
export type ProjectSettingsRes = {
  version: number;
  enabled: boolean;
  unlockRestriction: "anyone" | "reporter" | "projectAdmins";
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
};

/**
 * Reads the ticket lock settings of the project.
 *
 * A project that an admin did not configure gets the default settings.
 * The client sends `projectId` to select the project. The client removes
 * `projectId` before the request comes to this handler. Use `ctx.project`.
 */
function handle(ctx: CtxGet<ProjectSettingsRes, ProjectSettingsReq, "project">): void {
  ctx.response.json(parseSettings(ctx.project.extensionProperties.settings));
}

export default withPermissions(handle, ['UPDATE_PROJECT']);
export type Handle = typeof handle;
