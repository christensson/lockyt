/**
 * The ticket lock settings for one project.
 *
 * The app keeps these settings as a JSON string in the `settings` extension
 * property of the project. The workflow rule, the HTTP handlers and the
 * configuration widget all use this module.
 *
 * This module must not import anything. The build puts it in a shared chunk
 * that the workflow rule and the HTTP handlers load at run time.
 */

/** The users who can move a locked ticket back to an unresolved state. */
export type UnlockRestriction = "anyone" | "reporter" | "projectAdmins";

/** The ticket lock settings of one project. */
export type TicketLockSettings = {
  version: number;
  enabled: boolean;
  unlockRestriction: UnlockRestriction;
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
};

/** The result of a check of settings that come from the user. */
export type ValidationResult =
  | { ok: true; value: TicketLockSettings }
  | { ok: false; errors: string[] };

/** The current version of the settings format. */
export function settingsVersion(): number {
  return 1;
}

/** The permitted values of `unlockRestriction`. */
export function unlockRestrictions(): UnlockRestriction[] {
  return ["anyone", "reporter", "projectAdmins"];
}

/** The settings for a project that an admin did not configure. */
export function defaultSettings(): TicketLockSettings {
  return {
    version: settingsVersion(),
    enabled: true,
    unlockRestriction: "anyone",
    allowComments: true,
    allowLinks: true,
    allowWorkItems: true,
    allowAttachments: false,
    allowTags: false
  };
}

/** The names of the boolean settings. */
export function booleanKeys(): string[] {
  return [
    "enabled",
    "allowComments",
    "allowLinks",
    "allowWorkItems",
    "allowAttachments",
    "allowTags"
  ];
}

function isUnlockRestriction(value: unknown): value is UnlockRestriction {
  return unlockRestrictions().indexOf(value as UnlockRestriction) >= 0;
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
      console.warn('[ticket-lock] The settings of the project are not valid JSON: ' + String(error));
      return null;
    }
  }
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }
  return candidate as Record<string, unknown>;
}

/**
 * Reads the settings of a project.
 *
 * This function accepts any value and never throws. If the value is absent,
 * empty or bad, the function returns the default settings. Each field that is
 * bad falls back to its own default. The workflow rule uses this function,
 * because a rule must not stop on bad data.
 *
 * @param raw The value of the `settings` extension property.
 * @returns The settings, with a default for each field that is absent or bad.
 */
export function parseSettings(raw: unknown): TicketLockSettings {
  const defaults = defaultSettings();
  const source = toObject(raw);
  if (source === null) {
    return defaults;
  }

  const result = defaults;
  const keys = booleanKeys();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (typeof source[key] === "boolean") {
      (result as unknown as Record<string, unknown>)[key] = source[key];
    }
  }
  if (isUnlockRestriction(source.unlockRestriction)) {
    result.unlockRestriction = source.unlockRestriction;
  }
  if (typeof source.version === "number") {
    result.version = source.version;
  }
  return result;
}

/**
 * Checks settings that come from the user.
 *
 * The POST handler uses this function. The function is strict: it rejects a
 * value that is not an object, an unknown key, a field that has the wrong
 * type, and an `unlockRestriction` that is not in the list.
 *
 * @param input The value that the user sent.
 * @returns The accepted settings, or the list of errors.
 */
export function validateSettings(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["The settings must be an object."] };
  }

  const source = input as Record<string, unknown>;
  const value = defaultSettings();
  const keys = booleanKeys();
  const known = keys.concat(["unlockRestriction", "version"]);

  const names = Object.keys(source);
  for (let i = 0; i < names.length; i++) {
    if (known.indexOf(names[i]) < 0) {
      errors.push("The setting \"" + names[i] + "\" is not known.");
    }
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const given = source[key];
    if (given === undefined) {
      continue;
    }
    if (typeof given !== "boolean") {
      errors.push("The setting \"" + key + "\" must be true or false.");
      continue;
    }
    (value as unknown as Record<string, unknown>)[key] = given;
  }

  if (source.unlockRestriction !== undefined) {
    if (isUnlockRestriction(source.unlockRestriction)) {
      value.unlockRestriction = source.unlockRestriction;
    } else {
      errors.push(
        "The setting \"unlockRestriction\" must be one of: " +
          unlockRestrictions().join(", ") + "."
      );
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value };
}

/**
 * Makes the string that the app keeps in the extension property.
 *
 * @param value The settings to keep.
 * @returns The settings as a JSON string.
 */
export function serializeSettings(value: TicketLockSettings): string {
  return JSON.stringify(value);
}
