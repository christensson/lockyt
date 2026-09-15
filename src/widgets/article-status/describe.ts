/**
 * Makes the sentences that tell the user what a frozen article permits.
 *
 * The status line and the information panel use these functions, so that the
 * wording is the same in each place.
 */

/** The part of the freeze state that the sentences need. */
export type LockDescription = {
  isLocked: boolean;
  enabled: boolean;
  unlockRestriction: 'anyone' | 'author' | 'lockedBy' | 'authorOrLockedBy' | 'projectAdmins';
  allowComments: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
  allowChildArticles: boolean;
  lockedByName: string;
  authorName: string;
  canLock: boolean;
  canUnlock: boolean;
};

/**
 * Lists what a user can do on the frozen article.
 *
 * @param state The freeze state.
 * @returns One sentence for each permitted operation.
 */
export function permittedSentences(state: LockDescription): string[] {
  const list: string[] = [];
  if (state.allowComments) {
    list.push('You can add, edit and remove a comment.');
  }
  if (state.allowChildArticles) {
    list.push('You can add and remove a child article.');
  }
  if (state.allowTags) {
    list.push('You can add and remove a tag.');
  }
  if (state.allowAttachments) {
    list.push('You can add and remove an attachment.');
  }
  list.push('You can move the article to a different parent article.');
  return list;
}

/**
 * Lists what a user cannot do on the frozen article.
 *
 * @param state The freeze state.
 * @returns One sentence for each operation that the app rejects.
 */
export function blockedSentences(state: LockDescription): string[] {
  const list: string[] = ['You cannot change the title, the content or the visibility.'];
  if (!state.allowComments) {
    list.push('You cannot add, edit or remove a comment.');
  }
  if (!state.allowChildArticles) {
    list.push('You cannot add or remove a child article.');
  }
  if (!state.allowTags) {
    list.push('You cannot add or remove a tag.');
  }
  if (!state.allowAttachments) {
    list.push('You cannot add or remove an attachment.');
  }
  return list;
}

/**
 * Tells who can unfreeze the article.
 *
 * @param state The freeze state.
 * @returns One sentence.
 */
export function whoCanUnfreeze(state: LockDescription): string {
  const r = state.unlockRestriction;
  const locker = state.lockedByName;
  if (r === 'author') {
    return 'The author (' + state.authorName + ') or a project admin can unfreeze this article.';
  }
  if (r === 'lockedBy') {
    if (!locker) {
      return 'The user who froze the article is not known. A project admin can unfreeze this article.';
    }
    return 'The user who froze the article (' + locker + ') or a project admin can unfreeze it.';
  }
  if (r === 'authorOrLockedBy') {
    if (!locker) {
      return 'The user who froze the article is not known. The author (' + state.authorName +
        ') or a project admin can unfreeze this article.';
    }
    return 'The author (' + state.authorName + '), the user who froze the article (' + locker +
      ') or a project admin can unfreeze it.';
  }
  if (r === 'projectAdmins') {
    return 'Only a project admin can unfreeze this article.';
  }
  return 'Each user who can edit this article can unfreeze it.';
}

/**
 * Tells who can freeze the article.
 *
 * @param state The freeze state.
 * @returns One sentence.
 */
export function whoCanFreeze(state: LockDescription): string {
  const r = state.unlockRestriction;
  if (r === 'author') {
    return 'The author (' + state.authorName + ') or a project admin can freeze this article.';
  }
  if (r === 'projectAdmins') {
    return 'Only a project admin can freeze this article.';
  }
  return 'Each user who can edit this article can freeze it.';
}
