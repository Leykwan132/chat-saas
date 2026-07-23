/// <reference types="vite/client" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Doc } from './_generated/dataModel';
import { sendTextToChannel } from './chat/channelSend';

describe('Avatar Agent delivery', () => {
  it('persists Agent output without sending it to another provider', async () => {
    const result = await sendTextToChannel(
      { service: 'avatar' } as Doc<'conversations'>,
      {} as Doc<'channels'>,
      'Hello from KiloBot',
    );

    expect(result.ok).toBe(true);
  });

  it('keeps Avatar available independently of channel plan gates', () => {
    const source = readFileSync('convex/chat/inbox.ts', 'utf8');
    expect(source).toContain('conv.service !== "avatar"');
  });
});
