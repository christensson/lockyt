import { Issue } from '@jetbrains/youtrack-scripting-api/entities';
import { requirements } from '../backend/requirements';

/**
 * Records who resolved an issue, and when.
 *
 * The rule writes the `resolvedBy` and `resolvedAt` extension properties of
 * the issue in the transaction that resolves it. The lock rule and the
 * status widget read them to tell who can reopen the issue.
 *
 * The rule runs also when the lock for issues is off in the project, so that
 * the data exists if an admin turns the lock on later. It never rejects the
 * change: a failure to record must not stop a resolution.
 *
 * The rule does not clear the properties when a user reopens the issue. The
 * lock rule reads `resolvedBy` in that same transaction, and the order of the
 * rules in one transaction is not fixed. The next resolution overwrites the
 * values.
 */
export const rule = Issue.onChange({
  title: 'Record who resolved an issue',

  guard(ctx) {
    const issue = ctx.issue;
    return issue.becomesResolved && !issue.becomesRemoved;
  },

  action(ctx) {
    const issue = ctx.issue;
    try {
      issue.extensionProperties.resolvedBy = ctx.currentUser;
      issue.extensionProperties.resolvedAt = Date.now();
    } catch (error) {
      console.warn('[issue-lock] The rule cannot record who resolved ' + issue.id + ': ' + String(error));
    }
  },

  requirements
});
