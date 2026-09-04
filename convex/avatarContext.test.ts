/// <reference types="vite/client" />
import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import { buildAvatarContextPrompt } from './avatarContext';

const modules = import.meta.glob('./**/*.ts');

beforeEach(() => vi.stubEnv('LIVEAVATAR_API_KEY', 'test-api-key'));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function createAgent(t: TestConvex<typeof schema>, userId: string) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert('agents', {
      name: 'Support',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Help the visitor.',
      templateKey: 'blank',
      fileSize: 0,
      userId,
      orgId: '',
      createdAt: now,
      updatedAt: now,
    });
  });
}

test('creates and persists a LiveAvatar context for an authorized Avatar manager', async () => {
  const t = convexTest(schema, modules);
  const agentId = await createAgent(t, 'owner');
  const authed = t.withIdentity({ subject: 'owner' });
  await authed.mutation(api.avatar.ensureForAgent, { agentId });
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    data: { id: 'context-id' },
  }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);

  await authed.action(api.avatarContext.save, {
    agentId,
    prompt: 'Help customers with billing.',
    openingText: 'Hello, how can I help?',
  });

  expect(fetchMock).toHaveBeenCalledWith('https://api.liveavatar.com/v1/contexts', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({
      name: 'Support Avatar',
      prompt: buildAvatarContextPrompt('Help customers with billing.', 'Hello, how can I help?'),
      opening_text: 'Hello, how can I help?',
    }),
  }));
  expect(await authed.query(api.avatar.getForAgent, { agentId })).toMatchObject({
    providerContextPrompt: 'Help customers with billing.',
    providerContextOpeningText: 'Hello, how can I help?',
  });
});

test('embeds opening text into the LiveAvatar system prompt', () => {
  expect(buildAvatarContextPrompt('Help customers with billing.', 'Hello, how can I help?'))
    .toBe('Help customers with billing.\n\nStart each new conversation with this opening message:\nHello, how can I help?');
});
