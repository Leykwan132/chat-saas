import { useRef, useState } from 'react';
import type { Id } from '../../../convex/_generated/dataModel';

export function useTelegramVerificationUrls(
  regenerate: (args: {
    subscriptionId: Id<'agentTelegramNotificationSubscriptions'>;
  }) => Promise<{ verificationUrl: string }>,
) {
  const [verificationUrls, setVerificationUrls] = useState<
    Partial<Record<Id<'agentTelegramNotificationSubscriptions'>, string>>
  >({});
  const loadingIds = useRef(new Set<string>());

  function rememberVerificationUrl(
    subscriptionId: Id<'agentTelegramNotificationSubscriptions'>,
    url: string,
  ) {
    setVerificationUrls((current) => ({ ...current, [subscriptionId]: url }));
  }

  async function ensureVerificationUrl(
    subscriptionId: Id<'agentTelegramNotificationSubscriptions'>,
  ) {
    if (verificationUrls[subscriptionId] || loadingIds.current.has(subscriptionId)) {
      return verificationUrls[subscriptionId];
    }
    loadingIds.current.add(subscriptionId);
    try {
      const result = await regenerate({ subscriptionId });
      rememberVerificationUrl(subscriptionId, result.verificationUrl);
      return result.verificationUrl;
    } finally {
      loadingIds.current.delete(subscriptionId);
    }
  }

  return { verificationUrls, rememberVerificationUrl, ensureVerificationUrl };
}
