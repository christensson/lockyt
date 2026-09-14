import type { Project } from '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs';

/**
 * App-specific extension properties for Project
 */
export type ProjectExtensionProperties = {
  settings?: string;
};

/**
 * Extended Project with app-specific extension properties
 */
export type ExtendedProject = Omit<Project, 'extensionProperties'> & {
  extensionProperties: ProjectExtensionProperties;
};

declare module '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs' {
  interface ExtensionPropertiesRegistry {
    Project: ProjectExtensionProperties;
  }
}

/**
 * Map of entity types to their extended versions
 * Extended types have extension properties, others are 'never'
 */
export type ExtendedProperties = {
  Issue: never;
  Project: ExtendedProject;
  Article: never;
  User: never;
  AppGlobalStorage: never;
};