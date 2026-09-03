import { v } from 'convex/values';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import {
  dashboardAvatarConfiguration,
  generateAvatarPublicKey,
  getAuthorizedAvatarAgent,
  getAvatarConfigurationByPublicKey,
  getWorkspaceAvatarConfiguration,
} from './avatarCore';
import {
  MAX_AVATAR_CONCURRENT_SESSIONS,
} from './avatarProvider';
import {
  DEFAULT_GEMINI_LIVE_VOICE,
  isGeminiLiveVoice,
} from '../shared/geminiLiveVoices';
import { getPublicMediaUrl } from './media/r2';
import { countActiveAvatarSessions } from './avatarSessionCapacity';
export const getForAgent = query({
  args: { agentId: v.id('agents') },
  handler: async (ctx, args) => {
    const { channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const configuration = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    if (!configuration) return null;
    const coverImageUrl = configuration.coverImageR2Key
      ? getPublicMediaUrl(configuration.coverImageR2Key)
      : undefined;
    return dashboardAvatarConfiguration(configuration, coverImageUrl);
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
      geminiVoice: DEFAULT_GEMINI_LIVE_VOICE,
      createdAt: now,
      updatedAt: now,
    });
    const configuration = await ctx.db.get(configurationId);
    if (!configuration) throw new Error('Could not create Avatar configuration');
    return dashboardAvatarConfiguration(configuration);
  },
});

export const updateGeminiVoice = mutation({
  args: {
    agentId: v.id('agents'),
    voice: v.string(),
  },
  handler: async (ctx, args) => {
    const { channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const configuration = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    if (!configuration) throw new Error('Avatar configuration not found');
    if (!isGeminiLiveVoice(args.voice)) throw new Error('Choose a supported Gemini Live voice');
    await ctx.db.patch(configuration._id, {
      geminiVoice: args.voice,
      updatedAt: Date.now(),
    });
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
    if (args.enabled && !configuration.avatarId) {
      throw new Error('Configure an avatar first');
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
  },
  handler: async (ctx, args) => {
    const configuration = await ctx.db.get(args.configurationId);
    if (!configuration) throw new Error('Avatar configuration not found');
    await ctx.db.patch(configuration._id, {
      enabled: true,
      avatarId: args.avatarId,
      avatarName: args.avatarName,
      avatarPreviewUrl: args.avatarPreviewUrl,
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
      coverImageUrl: v.optional(v.string()),
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
      ...(configuration.coverImageR2Key
        ? { coverImageUrl: getPublicMediaUrl(configuration.coverImageR2Key) }
        : {}),
    };
  },
});

export const assertSessionCapacity = internalQuery({
  args: { publicKey: v.string() },
  handler: async (ctx, args) => {
    const configuration = await getAvatarConfigurationByPublicKey(ctx, args.publicKey);
    const activeCount = await countActiveAvatarSessions(ctx, configuration._id);
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
    const activeCount = await countActiveAvatarSessions(ctx, configuration._id);
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
