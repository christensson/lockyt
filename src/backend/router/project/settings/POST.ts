import { withPermissions } from '@jetbrains/youtrack-apps-tools/dx/runtime';
import { serializeSettings, validateSettings } from '@/backend/shared/ticket-lock-settings';

/**
 * @zod-to-schema
 */
export type SaveSettingsReq = {
  projectId: string;
  enabled: boolean;
  unlockRestriction: "anyone" | "reporter" | "projectAdmins";
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
};

/**
 * @zod-to-schema
 */
export type SaveSettingsRes = {
  ok: boolean;
  errors: string[];
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
 * Keeps the ticket lock settings of the project.
 *
 * The handler checks the settings before it keeps them. If a setting is bad,
 * the handler answers with code 400 and the list of errors. If the settings
 * are good, the handler writes them as a JSON string and sends them back.
 */
function handle(ctx: CtxPost<SaveSettingsReq, SaveSettingsRes, never, "project">): void {
  const body = ctx.request.json() as unknown as Record<string, unknown>;

  // The client removes projectId, but a direct caller can still send it.
  const candidate: Record<string, unknown> = {};
  const names = Object.keys(body || {});
  for (let i = 0; i < names.length; i++) {
    if (names[i] !== 'projectId') {
      candidate[names[i]] = body[names[i]];
    }
  }

  const checked = validateSettings(candidate);
  if (!checked.ok) {
    ctx.response.code = 400;
    ctx.response.json({
      ok: false,
      errors: checked.errors,
      version: 0,
      enabled: false,
      unlockRestriction: 'anyone',
      allowComments: false,
      allowLinks: false,
      allowWorkItems: false,
      allowAttachments: false,
      allowTags: false
    });
    return;
  }

  const value = checked.value;
  ctx.project.extensionProperties.settings = serializeSettings(value);

  ctx.response.json({
    ok: true,
    errors: [],
    version: value.version,
    enabled: value.enabled,
    unlockRestriction: value.unlockRestriction,
    allowComments: value.allowComments,
    allowLinks: value.allowLinks,
    allowWorkItems: value.allowWorkItems,
    allowAttachments: value.allowAttachments,
    allowTags: value.allowTags
  });
}

export default withPermissions(handle, ['UPDATE_PROJECT']);
export type Handle = typeof handle;
