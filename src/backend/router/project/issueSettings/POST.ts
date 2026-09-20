import { withPermissions } from '@jetbrains/youtrack-apps-tools/dx/runtime';
import { defaultIssueSettings, saveIssueSettings } from '@/backend/shared/lock-settings';

/**
 * @zod-to-schema
 */
export type SaveIssueSettingsReq = {
  projectId: string;
  enabled: boolean;
  unlockRestriction: "anyone" | "reporter" | "resolver" | "reporterOrResolver" | "projectAdmins";
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
  allowDelete: boolean;
};

/**
 * @zod-to-schema
 */
export type SaveIssueSettingsRes = {
  ok: boolean;
  errors: string[];
  enabled: boolean;
  unlockRestriction: "anyone" | "reporter" | "resolver" | "reporterOrResolver" | "projectAdmins";
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
  allowDelete: boolean;
};

/**
 * Keeps the issue lock settings of the project.
 *
 * The handler checks the settings before it keeps them. If a setting is bad,
 * the handler answers with code 400 and the list of errors. The article
 * section of the settings stays as it is.
 */
function handle(ctx: CtxPost<SaveIssueSettingsReq, SaveIssueSettingsRes, never, "project">): void {
  const body = ctx.request.json() as unknown as Record<string, unknown>;
  const candidate: Record<string, unknown> = {};
  const names = Object.keys(body || {});
  for (let i = 0; i < names.length; i++) {
    if (names[i] !== 'projectId') {
      candidate[names[i]] = body[names[i]];
    }
  }
  const checked = saveIssueSettings(ctx.project, candidate);
  if (!checked.ok) {
    ctx.response.code = 400;
    ctx.response.json({ ok: false, errors: checked.errors, ...defaultIssueSettings() });
    return;
  }
  ctx.response.json({ ok: true, errors: [], ...checked.value });
}

export default withPermissions(handle, ['UPDATE_PROJECT']);
export type Handle = typeof handle;
