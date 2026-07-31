import type { Id } from '../../convex/_generated/dataModel';

type CompleteSignupArgs = {
  code: string;
  attemptId: Id<'whatsappConnectionAttempts'>;
};

type CompleteSignup = (
  args: CompleteSignupArgs,
) => Promise<{ status: 'syncing' }>;

export async function completeWhatsAppSignupFromCode({
  code,
  attemptPromise,
  completeSignup,
}: {
  code: string;
  attemptPromise:
    | Promise<Id<'whatsappConnectionAttempts'> | undefined>
    | undefined;
  completeSignup: CompleteSignup;
}): Promise<{ status: 'syncing' }> {
  const attemptId = await attemptPromise;
  if (attemptId === undefined) {
    throw new Error('Connection attempt was not created.');
  }
  return await completeSignup({ code, attemptId });
}
