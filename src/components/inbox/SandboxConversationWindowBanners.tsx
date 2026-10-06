import { useState } from 'react';
import { MessagingWindowBanner } from './MessagingWindowBanner';

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
        explanation="An eligible WhatsApp ad or Facebook Page call-to-action starts a 72-hour free messaging window after your qualifying reply. Templates are still required when the separate 24-hour conversation window is closed."
      />
      <MessagingWindowBanner
        sample
        label="Conversation window"
        expiresAt={startedAt + 24 * HOUR_MS}
        color="yellow"
        explanation="You can send free-form replies within 24 hours of the customer's latest message. Each new customer message restarts this window. After it closes, use an approved template."
      />
    </div>
  );
}
