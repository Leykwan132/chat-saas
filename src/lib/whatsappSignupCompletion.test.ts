import { expect, test } from 'vitest';
import type { Id } from '../../convex/_generated/dataModel';
import { completeWhatsAppSignupFromCode } from './whatsappSignupCompletion';

test('calls the backend with only the OAuth code and connection attempt', async () => {
  let resolveAttempt: (
    attemptId: Id<'whatsappConnectionAttempts'>,
  ) => void = () => undefined;
  const attemptPromise = new Promise<Id<'whatsappConnectionAttempts'>>(
    (resolve) => {
      resolveAttempt = resolve;
    },
  );
  let received: Record<string, unknown> | undefined;
  const completionPromise = completeWhatsAppSignupFromCode({
    code: 'oauth-code',
    attemptPromise,
    completeSignup: async (args) => {
      received = args;
      return { status: 'syncing' };
    },
  });

  resolveAttempt('attempt-123' as Id<'whatsappConnectionAttempts'>);
  const result = await completionPromise;

  expect(received).toEqual({
    code: 'oauth-code',
    attemptId: 'attempt-123',
  });
  expect(result).toEqual({ status: 'syncing' });
});

test('fails when the connection attempt was not created', async () => {
  await expect(
    completeWhatsAppSignupFromCode({
      code: 'oauth-code',
      attemptPromise: Promise.resolve(undefined),
      completeSignup: async () => ({ status: 'syncing' }),
    }),
  ).rejects.toThrow('Connection attempt was not created.');
});
