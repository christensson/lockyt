/**
 * The lock settings for one project.
 *
 * The app keeps these settings as a JSON string in the `settings` extension
 * property of the project. The workflow rules, the HTTP handlers and the
 * configuration widget all use this module.
 *
 * The stored shape is `{ version: 1, ticket: {...}, article: {...} }`.
 *
 * This module has no run-time imports. The build puts it in a shared chunk
 * that the workflow rules and the HTTP handlers load at run time.
 */
import type { ArticleUnlockRestriction, TicketUnlockRestriction } from './permissions';

/** The lock settings for tickets. */
export type TicketLockSettings = {
  enabled: boolean;
  unlockRestriction: TicketUnlockRestriction;
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
};

/** The lock settings for articles. */
export type ArticleLockSettings = {
  enabled: boolean;
  unlockRestriction: ArticleUnlockRestriction;
  allowComments: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
  allowChildArticles: boolean;
};

/** The lock settings of one project. */
export type LockSettings = {
  version: number;
  ticket: TicketLockSettings;
  article: ArticleLockSettings;
};

/** The result of a check of settings that come from the user. */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

/** The current version of the settings format. */
export function settingsVersion(): number {
  return 1;
}

/** The permitted values of the ticket `unlockRestriction`. */
export function ticketUnlockRestrictions(): TicketUnlockRestriction[] {
  return ["anyone", "reporter", "projectAdmins"];
}

/** The permitted values of the article `unlockRestriction`. */
export function articleUnlockRestrictions(): ArticleUnlockRestriction[] {
  return ["anyone", "author", "lockedBy", "authorOrLockedBy", "projectAdmins"];
}

/** The ticket settings for a project that an admin did not configure. */
export function defaultTicketSettings(): TicketLockSettings {
  return {
    enabled: true,
    unlockRestriction: "anyone",
    allowComments: true,
    allowLinks: true,
    allowWorkItems: true,
    allowAttachments: false,
    allowTags: false
  };
}

/** The article settings for a project that an admin did not configure. */
export function defaultArticleSettings(): ArticleLockSettings {
  return {
    enabled: true,
    unlockRestriction: "anyone",
    allowComments: true,
    allowAttachments: false,
    allowTags: true,
    allowChildArticles: true
  };
}

/** The settings for a project that an admin did not configure. */
export function defaultLockSettings(): LockSettings {
  return {
    version: settingsVersion(),
    ticket: defaultTicketSettings(),
    article: defaultArticleSettings()
  };
}

/** The names of the boolean ticket settings. */
export function ticketBooleanKeys(): string[] {
  return ["enabled", "allowComments", "allowLinks", "allowWorkItems", "allowAttachments", "allowTags"];
}

/** The names of the boolean article settings. */
export function articleBooleanKeys(): string[] {
  return ["enabled", "allowComments", "allowAttachments", "allowTags", "allowChildArticles"];
}

function toObject(raw: unknown): Record<string, unknown> | null {
  let candidate: unknown = raw;
  if (typeof raw === "string") {
    if (raw.length === 0) {
      return null;
    }
    try {
      candidate = JSON.parse(raw);
    } catch (error) {
      // Bad JSON. The caller gets the default settings.
      console.warn('[lock] The settings of the project are not valid JSON: ' + String(error));
      return null;
    }
  }
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }
  return candidate as Record<string, unknown>;
}

/**
 * Reads one section of the settings. Each bad field falls back to its default.
 */
function parseSection<T extends object>(
  raw: unknown,
  defaults: T,
  booleanKeys: string[],
  restrictions: string[]
): T {
  const source = toObject(raw);
  if (source === null) {
    return defaults;
  }
  const result = defaults as unknown as Record<string, unknown>;
  for (let i = 0; i < booleanKeys.length; i++) {
    const key = booleanKeys[i];
    if (typeof source[key] === "boolean") {
      result[key] = source[key];
    }
  }
  if (typeof source.unlockRestriction === "string" && restrictions.indexOf(source.unlockRestriction) >= 0) {
    result.unlockRestriction = source.unlockRestriction;
  }
  return result as unknown as T;
}

/**
 * Checks one section of settings that come from the user. Strict.
 */
function validateSection<T extends object>(
  input: unknown,
  defaults: T,
  booleanKeys: string[],
  restrictions: string[]
): ValidationResult<T> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["The settings must be an object."] };
  }
  const source = input as Record<string, unknown>;
  const value = defaults as unknown as Record<string, unknown>;
  const errors: string[] = [];
  const known = booleanKeys.concat(["unlockRestriction"]);

  const names = Object.keys(source);
  for (let i = 0; i < names.length; i++) {
    if (known.indexOf(names[i]) < 0) {
      errors.push("The setting \"" + names[i] + "\" is not known.");
    }
  }
  for (let i = 0; i < booleanKeys.length; i++) {
    const key = booleanKeys[i];
    const given = source[key];
    if (given === undefined) {
      continue;
    }
    if (typeof given !== "boolean") {
      errors.push("The setting \"" + key + "\" must be true or false.");
      continue;
    }
    value[key] = given;
  }
  if (source.unlockRestriction !== undefined) {
    if (typeof source.unlockRestriction === "string" && restrictions.indexOf(source.unlockRestriction) >= 0) {
      value.unlockRestriction = source.unlockRestriction;
    } else {
      errors.push("The setting \"unlockRestriction\" must be one of: " + restrictions.join(", ") + ".");
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: value as unknown as T };
}

/**
 * Reads the settings of a project.
 *
 * This function accepts any value and never throws. If the value is absent,
 * empty or bad, the function returns the default settings. Each section and
 * each field that is bad falls back to its own default. The workflow rules use
 * this function, because a rule must not stop on bad data.
 *
 * @param raw The value of the `settings` extension property.
 * @returns The settings, with a default for each field that is absent or bad.
 */
export function parseLockSettings(raw: unknown): LockSettings {
  const source = toObject(raw);
  if (source === null) {
    return defaultLockSettings();
  }
  return {
    version: settingsVersion(),
    ticket: parseSection(source.ticket, defaultTicketSettings(), ticketBooleanKeys(), ticketUnlockRestrictions()),
    article: parseSection(source.article, defaultArticleSettings(), articleBooleanKeys(), articleUnlockRestrictions())
  };
}

/**
 * Checks ticket settings that come from the user.
 *
 * @param input The value that the user sent.
 * @returns The accepted settings, or the list of errors.
 */
export function validateTicketSettings(input: unknown): ValidationResult<TicketLockSettings> {
  return validateSection(input, defaultTicketSettings(), ticketBooleanKeys(), ticketUnlockRestrictions());
}

/**
 * Checks article settings that come from the user.
 *
 * @param input The value that the user sent.
 * @returns The accepted settings, or the list of errors.
 */
export function validateArticleSettings(input: unknown): ValidationResult<ArticleLockSettings> {
  return validateSection(input, defaultArticleSettings(), articleBooleanKeys(), articleUnlockRestrictions());
}

/**
 * Makes the string that the app keeps in the extension property.
 *
 * @param value The settings to keep.
 * @returns The settings as a JSON string.
 */
export function serializeLockSettings(value: LockSettings): string {
  return JSON.stringify(value);
}

/** A project, as far as this module reads and writes it. */
type ProjectProbe = {
  extensionProperties: Record<string, unknown>;
};

/**
 * Reads the lock settings of a project.
 *
 * @param project The project.
 * @returns The settings, with a default for each field that is absent or bad.
 */
export function readProjectLockSettings(project: unknown): LockSettings {
  const probe = project as ProjectProbe;
  const raw = probe.extensionProperties ? probe.extensionProperties.settings : undefined;
  return parseLockSettings(raw);
}

/**
 * Checks and keeps the ticket section of the settings of a project.
 *
 * The function reads the stored settings, replaces the ticket section, and
 * writes the full settings back. The article section stays as it is, in its
 * normalized form.
 *
 * @param project The project.
 * @param input The ticket settings that the user sent.
 * @returns The accepted settings, or the list of errors.
 */
export function saveTicketSettings(project: unknown, input: unknown): ValidationResult<TicketLockSettings> {
  const checked = validateTicketSettings(input);
  if (!checked.ok) {
    return checked;
  }
  const current = readProjectLockSettings(project);
  current.ticket = checked.value;
  (project as ProjectProbe).extensionProperties.settings = serializeLockSettings(current);
  return checked;
}

/**
 * Checks and keeps the article section of the settings of a project.
 *
 * @param project The project.
 * @param input The article settings that the user sent.
 * @returns The accepted settings, or the list of errors.
 */
export function saveArticleSettings(project: unknown, input: unknown): ValidationResult<ArticleLockSettings> {
  const checked = validateArticleSettings(input);
  if (!checked.ok) {
    return checked;
  }
  const current = readProjectLockSettings(project);
  current.article = checked.value;
  (project as ProjectProbe).extensionProperties.settings = serializeLockSettings(current);
  return checked;
}
