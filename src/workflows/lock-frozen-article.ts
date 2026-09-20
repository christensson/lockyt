import { Article } from '@jetbrains/youtrack-scripting-api/entities';
import { check } from '@jetbrains/youtrack-scripting-api/workflow';
import type { Article as ArticleEntity } from '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs';
import type { ArticleLockSettings } from '../backend/shared/lock-settings';
import { readArticleSettings } from '../backend/shared/article-lock';

/**
 * Makes a frozen article read-only.
 *
 * INVARIANT: this rule reads only `isLocked` from the extension properties,
 * and it tests only these changes: title, content, comments, attachments,
 * tags, child articles, visibility and the removal of the article. It must never test an extension
 * property, `updated` or `updatedBy`. The `article/lock` POST handler freezes
 * and unfreezes in a transaction that changes only extension properties. That
 * transaction must pass this rule.
 *
 * The rule has no unfreeze path. Only the POST handler unfreezes.
 */

/**
 * Tells if a set of the article changes in the transaction.
 *
 * @param set A set such as `article.tags`.
 * @returns True if the set has a change.
 */
function setChanged(set: { isChanged?: boolean } | null | undefined): boolean {
  return !!set && set.isChanged === true;
}

/**
 * Tells if the transaction adds or removes a child article.
 *
 * A change of the order of the child articles is not an addition or a
 * removal, so the function does not use `isChanged` alone.
 *
 * @param article The frozen article.
 * @returns True if a child article is added or removed.
 */
function childArticlesChanged(article: ArticleEntity): boolean {
  try {
    const kids = article.childArticles;
    if (!kids) {
      return false;
    }
    const added = kids.added;
    const removed = kids.removed;
    return (!!added && added.isNotEmpty()) || (!!removed && removed.isNotEmpty());
  } catch (error) {
    console.warn('[lock] The rule cannot read the child articles: ' + String(error));
    return false;
  }
}

/**
 * Finds each change that the settings do not permit.
 *
 * @param article The frozen article.
 * @param settings The article settings of the project.
 * @returns The names of the changes that the rule rejects.
 */
function collectBlockedParts(article: ArticleEntity, settings: ArticleLockSettings): string[] {
  const blocked: string[] = [];

  if (article.isChanged('summary')) {
    blocked.push('title');
  }
  if (article.isChanged('content')) {
    blocked.push('content');
  }
  if (!settings.allowComments &&
      (setChanged(article.comments) || article.editedComments.isNotEmpty() || setChanged(article.pinnedComments))) {
    blocked.push('comments');
  }
  if (!settings.allowAttachments && setChanged(article.attachments)) {
    blocked.push('attachments');
  }
  if (!settings.allowTags && setChanged(article.tags)) {
    blocked.push('tags');
  }
  if (!settings.allowChildArticles && childArticlesChanged(article)) {
    blocked.push('child articles');
  }
  if (article.isChanged('permittedUsers') || article.isChanged('permittedGroups')) {
    blocked.push('visibility');
  }

  return blocked;
}

/**
 * Makes the text that tells the user why the rule rejects the change.
 *
 * A child-article change comes from an action on a different article. The
 * message then names this article, so that the user knows which article to
 * unfreeze.
 *
 * @param article The frozen article.
 * @param blocked The names of the changes that the rule rejects.
 * @returns The message for the user.
 */
function blockMessage(article: ArticleEntity, blocked: string[]): string {
  if (blocked.length === 1 && blocked[0] === 'child articles') {
    return 'Article ' + article.id + ' is frozen. You cannot add or remove a child article of it. ' +
      'Unfreeze that article first.';
  }
  return 'Article ' + article.id + ' is frozen. You cannot change these: ' +
    blocked.join(', ') + '. Unfreeze the article first.';
}

export const rule = Article.onChange({
  title: 'Lock a frozen article',

  guard(ctx) {
    const article = ctx.article;
    if (article.isNew || article.isChanged('project')) {
      return false;
    }
    if (article.extensionProperties.isLocked !== true) {
      return false;
    }
    return readArticleSettings(article).enabled;
  },

  action(ctx) {
    const article = ctx.article;
    const settings = readArticleSettings(article);

    // A removal comes alone. Handle it before the rule reads the change sets.
    if (article.becomesRemoved) {
      check(
        settings.allowDelete,
        'Article ' + article.id + ' is frozen. You cannot delete it. Unfreeze the article first.'
      );
      return;
    }

    const blocked = collectBlockedParts(article, settings);
    check(blocked.length === 0, blockMessage(article, blocked));
  },

  // Without `removal: true` YouTrack never runs the rule when a user deletes
  // the article, and the deletion check above never runs.
  runOn: { change: true, removal: true },

  requirements: {}
});
