import { useState } from 'react';
import { MessagingWindowBanner } from './MessagingWindowBanner';
import { MessagingWindowExplanation } from './MessagingWindowExplanation';

const HOUR_MS = 60 * 60 * 1000;

export function SandboxConversationWindowBanners() {
  const [startedAt] = useState(() => Date.now() - 10 * 60 * 1000);

  return (
    <div aria-label="Sample WhatsApp messaging windows">
      <MessagingWindowBanner
        sample
        label="Free messaging"
        expiresAt={startedAt + 72 * HOUR_MS}
        color="green"
        explanation={<MessagingWindowExplanation window="free" />}
      />
      <MessagingWindowBanner
        sample
        label="Conversation window"
        expiresAt={startedAt + 24 * HOUR_MS}
        color="yellow"
        explanation={<MessagingWindowExplanation window="conversation" />}
      />
    </div>
  );
}
