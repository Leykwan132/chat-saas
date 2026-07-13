export const FOLLOW_UP_MESSAGE_REQUIRED_ERROR = 'You need to select a message first.';

type FollowUpMessageAttempt = {
  templateName: string;
};

export function hasCompleteFollowUpMessages(attempts: FollowUpMessageAttempt[]) {
  return attempts.length > 0
    && attempts.every(({ templateName }) => templateName.trim().length > 0);
}
