/// <reference types="vite/client" />
import { convexTest, type TestConvex } from 'convex-test';
import { expect, test } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';
import { dashboardAvatarConfiguration } from './avatarCore';

const modules = import.meta.glob('./**/*.ts');

test('dashboard Avatar configuration never exposes provider ids', () => {
  const result = dashboardAvatarConfiguration({
    avatarId: 'hidden-avatar-id',
    voiceId: 'hidden-voice-id',
    avatarName: 'Wayne',
    voiceName: 'Calm English',
    publicKey: 'avatar_public',
    enabled: true,
    language: 'en',
    updatedAt: 1,
  } as never);

  expect(result).toMatchObject({ avatarName: 'Wayne', voiceName: 'Calm English' });
  expect(result).not.toHaveProperty('avatarId');
  expect(result).not.toHaveProperty('voiceId');
});

async function createAgent(t: TestConvex<typeof schema>, userId: string) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert('agents', {
      name: 'Avatar Agent',
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

async function enableAvatarConfiguration(t: TestConvex<typeof schema>, publicKey: string) {
  await t.run(async (ctx) => {
    const configuration = await ctx.db
      .query('avatarConfigurations')
      .withIndex('by_publicKey', (q) => q.eq('publicKey', publicKey))
      .unique();
    if (!configuration) throw new Error('Avatar configuration not found');
    await ctx.db.patch(configuration._id, { enabled: true });
  });
}

test('Avatar setup is stable and creates an Avatar channel', async () => {
  const t = convexTest(schema, modules);
  const agentId = await createAgent(t, 'avatar_owner');
  const authed = t.withIdentity({ subject: 'avatar_owner', email: 'owner@example.com' });

  const first = await authed.mutation(api.avatar.ensureForAgent, { agentId });
  const second = await authed.mutation(api.avatar.ensureForAgent, { agentId });

  expect(second.publicKey).toBe(first.publicKey);
  expect(first.enabled).toBe(false);

  const stored = await t.run(async (ctx) => ({
    channels: await ctx.db.query('channels').collect(),
    configurations: await ctx.db.query('avatarConfigurations').collect(),
  }));

  expect(stored.channels).toHaveLength(1);
  expect(stored.channels[0]?.service).toBe('avatar');
  expect(stored.configurations).toHaveLength(1);
});

test('validated Avatar metadata configures the Web SDK runtime without an embed', async () => {
  const t = convexTest(schema, modules);
  const agentId = await createAgent(t, 'configured_owner');
  const authed = t.withIdentity({ subject: 'configured_owner' });
  const initial = await authed.mutation(api.avatar.ensureForAgent, { agentId });
  const configurationId = await t.run(async (ctx) => {
    const configuration = await ctx.db
      .query('avatarConfigurations')
      .withIndex('by_publicKey', (q) => q.eq('publicKey', initial.publicKey))
      .unique();
    if (!configuration) throw new Error('Avatar configuration not found');
    return configuration._id;
  });

  await t.mutation(internal.avatar.saveConfiguration, {
    configurationId,
    avatarId: 'avatar-id',
    avatarName: 'Wayne',
    avatarPreviewUrl: 'https://example.com/avatar.png',
    voiceId: 'voice-id',
    voiceName: 'Calm English',
    voiceLanguage: 'en',
    voiceGender: 'male',
    language: 'en',
  });

  const configured = await authed.query(api.avatar.getForAgent, { agentId });
  expect(configured).toMatchObject({
    configured: true,
    enabled: true,
    avatarName: 'Wayne',
    avatarPreviewUrl: 'https://example.com/avatar.png',
  });
  expect(configured?.embedUrl).toBeUndefined();
  expect(await t.query(api.avatar.publicGetConfig, {
    publicKey: initial.publicKey,
  })).toEqual({
    publicKey: initial.publicKey,
    language: 'en',
    avatarPreviewUrl: 'https://example.com/avatar.png',
  });
});

test('Avatar setup is unique per workspace', async () => {
  const t = convexTest(schema, modules);
  const firstAgentId = await createAgent(t, 'workspace_owner');
  const secondAgentId = await createAgent(t, 'workspace_owner');
  const authed = t.withIdentity({ subject: 'workspace_owner' });

  const first = await authed.mutation(api.avatar.ensureForAgent, { agentId: firstAgentId });
  const second = await authed.mutation(api.avatar.ensureForAgent, { agentId: secondAgentId });

  expect(second.publicKey).toBe(first.publicKey);
  const configurations = await t.run(async (ctx) => await ctx.db.query('avatarConfigurations').collect());
  expect(configurations).toHaveLength(1);
});

test('personal workspaces never share Avatar configuration', async () => {
  const t = convexTest(schema, modules);
  const firstAgentId = await createAgent(t, 'first_owner');
  const secondAgentId = await createAgent(t, 'second_owner');

  const first = await t.withIdentity({ subject: 'first_owner' }).mutation(
    api.avatar.ensureForAgent,
    { agentId: firstAgentId },
  );
  const second = await t.withIdentity({ subject: 'second_owner' }).mutation(
    api.avatar.ensureForAgent,
    { agentId: secondAgentId },
  );

  expect(second.publicKey).not.toBe(first.publicKey);
  const configurations = await t.run(async (ctx) => await ctx.db.query('avatarConfigurations').collect());
  expect(configurations).toHaveLength(2);
});

test('LiveAvatar session ids and event ids are idempotent', async () => {
  const t = convexTest(schema, modules);
  const agentId = await createAgent(t, 'avatar_session_owner');
  const setup = await t
    .withIdentity({ subject: 'avatar_session_owner' })
    .mutation(api.avatar.ensureForAgent, { agentId });
  await enableAvatarConfiguration(t, setup.publicKey);

  const first = await t.mutation(internal.avatar.registerSession, {
    publicKey: setup.publicKey,
    visitorId: 'visitor-1',
    sessionId: 'session-1',
    isSandbox: true,
  });
  const second = await t.mutation(internal.avatar.registerSession, {
    publicKey: setup.publicKey,
    visitorId: 'visitor-1',
    sessionId: 'session-1',
    isSandbox: true,
  });

  expect(second).toBe(first);

  const eventOne = await t.mutation(internal.avatar.recordLifecycleEvent, {
    sessionId: 'session-1',
    eventId: 'event-1',
    eventType: 'session.started',
    sourceEventId: null,
  });
  const eventTwo = await t.mutation(internal.avatar.recordLifecycleEvent, {
    sessionId: 'session-1',
    eventId: 'event-1',
    eventType: 'session.started',
    sourceEventId: null,
  });

  expect(eventOne).toBe(true);
  expect(eventTwo).toBe(false);
});

test('Avatar allows at most two concurrent sessions per workspace', async () => {
  const t = convexTest(schema, modules);
  const agentId = await createAgent(t, 'concurrency_owner');
  const setup = await t.withIdentity({ subject: 'concurrency_owner' }).mutation(
    api.avatar.ensureForAgent,
    { agentId },
  );
  await enableAvatarConfiguration(t, setup.publicKey);

  for (const sessionId of ['session-1', 'session-2']) {
    await t.mutation(internal.avatar.registerSession, {
      publicKey: setup.publicKey,
      visitorId: sessionId,
      sessionId,
      isSandbox: false,
    });
  }

  await expect(t.mutation(internal.avatar.registerSession, {
    publicKey: setup.publicKey,
    visitorId: 'session-3',
    sessionId: 'session-3',
    isSandbox: false,
  })).rejects.toThrow('concurrent');
});

test('ending an Avatar session releases its active session slot', async () => {
  const t = convexTest(schema, modules);
  const agentId = await createAgent(t, 'ending_owner');
  const setup = await t.withIdentity({ subject: 'ending_owner' }).mutation(
    api.avatar.ensureForAgent,
    { agentId },
  );
  await enableAvatarConfiguration(t, setup.publicKey);

  await t.mutation(internal.avatar.registerSession, {
    publicKey: setup.publicKey,
    visitorId: 'visitor-1',
    sessionId: 'session-1',
    isSandbox: false,
  });

  await t.mutation(api.avatarConversation.recordEvent, {
    publicKey: setup.publicKey,
    visitorId: 'visitor-1',
    sessionId: 'session-1',
    eventId: 'event-stop-1',
    eventType: 'session.stopped',
    endReason: 'client_ended',
  });

  const session = await t.run(async (ctx) => await ctx.db
    .query('avatarSessions')
    .withIndex('by_sessionId', (q) => q.eq('sessionId', 'session-1'))
    .unique());
  expect(session?.status).toBe('stopped');

  await expect(t.mutation(internal.avatar.registerSession, {
    publicKey: setup.publicKey,
    visitorId: 'visitor-2',
    sessionId: 'session-2',
    isSandbox: false,
  })).resolves.toBeTruthy();
});

test('disabled Avatar embeds resolve as unavailable', async () => {
  const t = convexTest(schema, modules);
  const agentId = await createAgent(t, 'disabled_owner');
  const authed = t.withIdentity({ subject: 'disabled_owner' });
  const setup = await authed.mutation(api.avatar.ensureForAgent, { agentId });
  await authed.mutation(api.avatar.updateSettings, {
    agentId,
    enabled: false,
  });

  expect(await t.query(api.avatar.publicGetConfig, { publicKey: setup.publicKey })).toBeNull();
});
