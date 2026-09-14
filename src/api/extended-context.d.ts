import type { ExtendedProject } from './extended-entities.js';

/**
 * Project context with extended entity (includes extension properties)
 */
export type ExtendedProjectCtx<T extends import('@jetbrains/youtrack-apps-tools/dx').ProjectCtx> =
  Omit<T, 'project'> & { project: ExtendedProject };


