import { withPermissions } from '@jetbrains/youtrack-apps-tools/dx/runtime';
import { defaultTicketSettings, saveTicketSettings } from '@/backend/shared/lock-settings';

/**
 * @zod-to-schema
 */
export type SaveTicketSettingsReq = {
  projectId: string;
  enabled: boolean;
  unlockRestriction: "anyone" | "reporter" | "resolver" | "reporterOrResolver" | "projectAdmins";
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
};

/**
 * @zod-to-schema
 */
export type SaveTicketSettingsRes = {
  ok: boolean;
  errors: string[];
  enabled: boolean;
  unlockRestriction: "anyone" | "reporter" | "resolver" | "reporterOrResolver" | "projectAdmins";
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
};

/**
 * Keeps the ticket lock settings of the project.
 *
 * The handler checks the settings before it keeps them. If a setting is bad,
 * the handler answers with code 400 and the list of errors. The article
 * section of the settings stays as it is.
 */
function handle(ctx: CtxPost<SaveTicketSettingsReq, SaveTicketSettingsRes, never, "project">): void {
  const body = ctx.request.json() as unknown as Record<string, unknown>;
  const candidate: Record<string, unknown> = {};
  const names = Object.keys(body || {});
  for (let i = 0; i < names.length; i++) {
    if (names[i] !== 'projectId') {
      candidate[names[i]] = body[names[i]];
    }
  }
  const checked = saveTicketSettings(ctx.project, candidate);
  if (!checked.ok) {
    ctx.response.code = 400;
    ctx.response.json({ ok: false, errors: checked.errors, ...defaultTicketSettings() });
    return;
  }
  ctx.response.json({ ok: true, errors: [], ...checked.value });
}

export default withPermissions(handle, ['UPDATE_PROJECT']);
export type Handle = typeof handle;
