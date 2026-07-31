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
  console.info('[whatsapp-connect] waiting for connection attempt', {
    hasAttemptPromise: attemptPromise !== undefined,
  });
  const attemptId = await attemptPromise;
  if (attemptId === undefined) {
    console.error('[whatsapp-connect] connection attempt unavailable');
    throw new Error('Connection attempt was not created.');
  }
  console.info('[whatsapp-connect] invoking completeSignup', {
    attemptId,
    hasCode: code.length > 0,
    codeLength: code.length,
  });
  const result = await completeSignup({ code, attemptId });
  console.info('[whatsapp-connect] completeSignup response received', {
    attemptId,
    status: result.status,
  });
  return result;
}
