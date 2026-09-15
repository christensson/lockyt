import type { Article, Project, User } from '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs';

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

/**
 * App-specific extension properties for Article
 */
export type ArticleExtensionProperties = {
  isLocked?: boolean;
  lockedBy?: User;
  lockedAt?: number;
  version?: number;
};

/**
 * Extended Article with app-specific extension properties
 */
export type ExtendedArticle = Omit<Article, 'extensionProperties'> & {
  extensionProperties: ArticleExtensionProperties;
};

declare module '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs' {
  interface ExtensionPropertiesRegistry {
    Article: ArticleExtensionProperties;
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
  Article: ExtendedArticle;
  User: never;
  AppGlobalStorage: never;
};