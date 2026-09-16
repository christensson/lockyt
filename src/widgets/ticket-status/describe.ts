/**
 * Makes the sentences that tell the user what a locked ticket permits.
 */

/** The part of the lock state that the sentences need. */
export type TicketLockDescription = {
  enabled: boolean;
  unlockRestriction: 'anyone' | 'reporter' | 'resolver' | 'reporterOrResolver' | 'projectAdmins';
  allowComments: boolean;
  allowLinks: boolean;
  allowWorkItems: boolean;
  allowAttachments: boolean;
  allowTags: boolean;
  reporterName: string;
  resolverName: string;
};

/**
 * Lists what a user can do on the locked ticket.
 *
 * @param state The lock state.
 * @returns One sentence for each permitted operation.
 */
export function permittedSentences(state: TicketLockDescription): string[] {
  const list: string[] = [];
  if (state.allowComments) {
    list.push('You can add, edit and remove a comment.');
  }
  if (state.allowLinks) {
    list.push('You can add and remove a link.');
  }
  if (state.allowWorkItems) {
    list.push('You can add, edit and remove a work item.');
  }
  if (state.allowAttachments) {
    list.push('You can add and remove an attachment.');
  }
  if (state.allowTags) {
    list.push('You can add and remove a tag.');
  }
  list.push('You can reopen the ticket. Reopen the ticket alone, then edit it.');
  return list;
}

/**
 * Lists what a user cannot do on the locked ticket.
 *
 * @param state The lock state.
 * @returns One sentence for each operation that the app rejects.
 */
export function blockedSentences(state: TicketLockDescription): string[] {
  const list: string[] = ['You cannot change a field, the summary, the description or the visibility.'];
  if (!state.allowComments) {
    list.push('You cannot add, edit or remove a comment.');
  }
  if (!state.allowLinks) {
    list.push('You cannot add or remove a link.');
  }
  if (!state.allowWorkItems) {
    list.push('You cannot add, edit or remove a work item.');
  }
  if (!state.allowAttachments) {
    list.push('You cannot add or remove an attachment.');
  }
  if (!state.allowTags) {
    list.push('You cannot add or remove a tag.');
  }
  list.push('You cannot change the resolution directly. Reopen the ticket, then resolve it again.');
  return list;
}

/**
 * Tells who can reopen the ticket.
 *
 * @param state The lock state.
 * @returns One sentence.
 */
export function whoCanReopen(state: TicketLockDescription): string {
  const r = state.unlockRestriction;
  const reporter = state.reporterName || 'not known';
  const resolver = state.resolverName;
  if (r === 'reporter') {
    return 'The reporter (' + reporter + ') or a project admin can reopen this ticket.';
  }
  if (r === 'resolver') {
    if (!resolver) {
      return 'The user who resolved the ticket is not known. A project admin can reopen this ticket.';
    }
    return 'The user who resolved the ticket (' + resolver + ') or a project admin can reopen it.';
  }
  if (r === 'reporterOrResolver') {
    if (!resolver) {
      return 'The user who resolved the ticket is not known. The reporter (' + reporter +
        ') or a project admin can reopen this ticket.';
    }
    return 'The reporter (' + reporter + '), the user who resolved the ticket (' + resolver +
      ') or a project admin can reopen it.';
  }
  if (r === 'projectAdmins') {
    return 'Only a project admin can reopen this ticket.';
  }
  return 'Each user who can update this ticket can reopen it.';
}
