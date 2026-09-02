import { v } from 'convex/values';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import type { Id } from './_generated/dataModel';
import {
  dashboardAvatarConfiguration,
  generateAvatarPublicKey,
  getAuthorizedAvatarAgent,
  getAvatarConfigurationByPublicKey,
  getWorkspaceAvatarConfiguration,
} from './avatarCore';
import {
  MAX_AVATAR_CONCURRENT_SESSIONS,
  MAX_AVATAR_SESSION_DURATION_SECONDS,
} from './avatarProvider';

async function countActiveSessions(
  ctx: QueryCtx | MutationCtx,
  configurationId: Id<'avatarConfigurations'>,
) {
  const recent = await ctx.db
    .query('avatarSessions')
    .withIndex('by_configurationId_and_startedAt', (q) => q
      .eq('configurationId', configurationId)
      .gte('startedAt', Date.now() - MAX_AVATAR_SESSION_DURATION_SECONDS * 1000))
    .order('desc')
    .take(100);
  const now = Date.now();
  return recent.filter((session) => {
    const durationSeconds = session.isSandbox ? 90 : MAX_AVATAR_SESSION_DURATION_SECONDS;
    return session.status === 'active' && session.startedAt >= now - durationSeconds * 1000;
  }).length;
}

export const getForAgent = query({
  args: { agentId: v.id('agents') },
  handler: async (ctx, args) => {
    const { channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const configuration = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    return configuration ? dashboardAvatarConfiguration(configuration) : null;
  },
});

export const ensureForAgent = mutation({
  args: { agentId: v.id('agents') },
  handler: async (ctx, args) => {
    const { agent, channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const existing = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    if (existing) return dashboardAvatarConfiguration(existing);

    const now = Date.now();
    const channelId = await ctx.db.insert('channels', {
      orgId: channelOrgId,
      service: 'avatar',
      status: 'connected',
      connectedByUserId: userId,
      defaultAgentId: agent._id,
      createdAt: now,
      updatedAt: now,
    });
    const configurationId = await ctx.db.insert('avatarConfigurations', {
      channelId,
      agentId: agent._id,
      orgId: channelOrgId,
      connectedByUserId: userId,
      publicKey: await generateAvatarPublicKey(ctx),
      enabled: false,
      language: 'en',
      createdAt: now,
      updatedAt: now,
    });
    const configuration = await ctx.db.get(configurationId);
    if (!configuration) throw new Error('Could not create Avatar configuration');
    return dashboardAvatarConfiguration(configuration);
  },
});

export const updateSettings = mutation({
  args: {
    agentId: v.id('agents'),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const configuration = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    if (!configuration) throw new Error('Avatar configuration not found');
    if (args.enabled && (!configuration.avatarId || !configuration.voiceId)) {
      throw new Error('Configure an avatar and voice first');
    }
    await ctx.db.patch(configuration._id, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });
  },
});

export const internalGetSetupContext = internalQuery({
  args: { agentId: v.id('agents') },
  handler: async (ctx, args) => {
    const { agent, channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const configuration = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    if (!configuration) throw new Error('Avatar configuration not found');
    return {
      configurationId: configuration._id,
      contextId: configuration.providerContextId,
      agentName: agent.name,
      systemPrompt: agent.systemPrompt,
    };
  },
});

export const saveConfiguration = internalMutation({
  args: {
    configurationId: v.id('avatarConfigurations'),
    avatarId: v.string(),
    avatarName: v.string(),
    avatarPreviewUrl: v.optional(v.string()),
    voiceId: v.string(),
    voiceName: v.string(),
    voiceLanguage: v.string(),
    voiceGender: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const configuration = await ctx.db.get(args.configurationId);
    if (!configuration) throw new Error('Avatar configuration not found');
    await ctx.db.patch(configuration._id, {
      enabled: true,
      avatarId: args.avatarId,
      avatarName: args.avatarName,
      avatarPreviewUrl: args.avatarPreviewUrl,
      voiceId: args.voiceId,
      voiceName: args.voiceName,
      voiceLanguage: args.voiceLanguage,
      voiceGender: args.voiceGender,
      language: args.language,
      updatedAt: Date.now(),
    });
  },
});

export const saveProviderEmbed = internalMutation({
  args: {
    configurationId: v.id('avatarConfigurations'),
    avatarId: v.string(),
    avatarName: v.string(),
    avatarPreviewUrl: v.optional(v.string()),
    voiceId: v.string(),
    voiceName: v.string(),
    voiceLanguage: v.string(),
    voiceGender: v.string(),
    language: v.string(),
    contextId: v.string(),
    embedId: v.string(),
    embedUrl: v.string(),
    embedScript: v.optional(v.string()),
    isSandbox: v.boolean(),
  },
  handler: async (ctx, args) => {
    const configuration = await ctx.db.get(args.configurationId);
    if (!configuration) throw new Error('Avatar configuration not found');
    const now = Date.now();
    await ctx.db.patch(configuration._id, {
      enabled: true,
      avatarId: args.avatarId,
      avatarName: args.avatarName,
      avatarPreviewUrl: args.avatarPreviewUrl,
      voiceId: args.voiceId,
      voiceName: args.voiceName,
      voiceLanguage: args.voiceLanguage,
      voiceGender: args.voiceGender,
      language: args.language,
      providerContextId: args.contextId,
      providerEmbedId: args.embedId,
      providerEmbedUrl: args.embedUrl,
      providerEmbedScript: args.embedScript,
      providerEmbedSandbox: args.isSandbox,
      embedCreatedAt: now,
      updatedAt: now,
    });
  },
});

export const saveProviderContext = internalMutation({
  args: {
    configurationId: v.id('avatarConfigurations'),
    contextId: v.string(),
    prompt: v.string(),
    openingText: v.string(),
  },
  handler: async (ctx, args) => {
    const configuration = await ctx.db.get(args.configurationId);
    if (!configuration) throw new Error('Avatar configuration not found');
    await ctx.db.patch(configuration._id, {
      providerContextId: args.contextId,
      providerContextPrompt: args.prompt,
      providerContextOpeningText: args.openingText,
      updatedAt: Date.now(),
    });
  },
});

export const publicGetConfig = query({
  args: { publicKey: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      publicKey: v.string(),
      language: v.string(),
      avatarPreviewUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const configuration = await ctx.db
      .query('avatarConfigurations')
      .withIndex('by_publicKey', (q) => q.eq('publicKey', args.publicKey))
      .unique();
    if (!configuration?.enabled) return null;
    return {
      publicKey: configuration.publicKey,
      language: configuration.language,
      ...(configuration.avatarPreviewUrl
        ? { avatarPreviewUrl: configuration.avatarPreviewUrl }
        : {}),
    };
  },
});

export const assertSessionCapacity = internalQuery({
  args: { publicKey: v.string() },
  handler: async (ctx, args) => {
    const configuration = await getAvatarConfigurationByPublicKey(ctx, args.publicKey);
    const activeCount = await countActiveSessions(ctx, configuration._id);
    if (activeCount >= MAX_AVATAR_CONCURRENT_SESSIONS) {
      throw new Error('Avatar concurrent session limit reached');
    }
  },
});

export const internalGetConfiguration = internalQuery({
  args: { publicKey: v.string() },
  handler: async (ctx, args) => await getAvatarConfigurationByPublicKey(ctx, args.publicKey),
});

export const registerSession = internalMutation({
  args: {
    publicKey: v.string(),
    visitorId: v.string(),
    sessionId: v.string(),
    isSandbox: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('avatarSessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .unique();
    if (existing) return existing._id;
    const configuration = await getAvatarConfigurationByPublicKey(ctx, args.publicKey);
    const activeCount = await countActiveSessions(ctx, configuration._id);
    if (activeCount >= MAX_AVATAR_CONCURRENT_SESSIONS) {
      throw new Error('Avatar concurrent session limit reached');
    }
    const now = Date.now();
    return await ctx.db.insert('avatarSessions', {
      configurationId: configuration._id,
      sessionId: args.sessionId,
      visitorId: args.visitorId,
      isSandbox: args.isSandbox,
      status: 'active',
      startedAt: now,
      updatedAt: now,
    });
  },
});

export const recordLifecycleEvent = internalMutation({
  args: {
    sessionId: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    sourceEventId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('avatarEvents')
      .withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
      .unique();
    if (existing) return false;
    await ctx.db.insert('avatarEvents', {
      sessionId: args.sessionId,
      eventId: args.eventId,
      eventType: args.eventType,
      sourceEventId: args.sourceEventId ?? undefined,
      createdAt: Date.now(),
    });
    return true;
  },
});
