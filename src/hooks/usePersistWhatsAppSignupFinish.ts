import { useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export function usePersistWhatsAppSignupFinish() {
  const recordSignupFinished = useMutation(
    api.whatsappEmbeddedSignup.recordSignupFinished,
  );

  return useCallback(
    async (
      attemptPromise: Promise<Id<'whatsappConnectionAttempts'> | undefined> | undefined,
      wabaId: string,
      phoneNumberId: string,
    ) => {
      const attemptId = await attemptPromise;
      if (attemptId === undefined) {
        throw new Error('WhatsApp connection attempt was not created.');
      }
      await recordSignupFinished({ attemptId, wabaId, phoneNumberId });
    },
    [recordSignupFinished],
  );
}
