/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import type { Doc } from './_generated/dataModel';
import { selectReusableInboxConversation } from './chat/threads';

const conversation = (status: Doc<'conversations'>['status']) => ({
  status,
  _id: 'conversation-id',
}) as Doc<'conversations'>;

describe('Avatar conversation identity', () => {
  it('reuses the returning visitor open conversation', () => {
    const existing = conversation('open');
    expect(selectReusableInboxConversation(existing, 'avatar')).toBe(existing);
  });

  it('creates a new conversation after the prior conversation closes', () => {
    expect(selectReusableInboxConversation(conversation('closed'), 'avatar')).toBeNull();
  });

  it('creates a new web conversation after the prior conversation closes', () => {
    expect(selectReusableInboxConversation(conversation('closed'), 'web')).toBeNull();
  });
});
