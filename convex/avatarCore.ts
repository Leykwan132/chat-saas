import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { getAuthContext, resolveChannelOrgId } from './authUtils';

const PUBLIC_KEY_PREFIX = 'avatar_';

export async function getAuthorizedAvatarAgent(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<'agents'>,
) {
  const { orgId, userId } = await getAuthContext(ctx);
  const channelOrgId = resolveChannelOrgId(orgId, userId);
  const agent = await ctx.db.get(agentId);
  if (agent === null || agent.orgId !== channelOrgId || (channelOrgId === '' && agent.userId !== userId)) {
    throw new Error('Agent not found');
  }
  return { agent, channelOrgId, userId };
}

export async function getAvatarConfigurationByPublicKey(
  ctx: QueryCtx | MutationCtx,
  publicKey: string,
) {
  const configuration = await ctx.db
    .query('avatarConfigurations')
    .withIndex('by_publicKey', (q) => q.eq('publicKey', publicKey))
    .unique();
  if (configuration === null || !configuration.enabled) {
    throw new Error('Avatar embed not found');
  }
  return configuration;
}

export async function getWorkspaceAvatarConfiguration(
  ctx: QueryCtx | MutationCtx,
  channelOrgId: string,
  userId: string,
) {
  return channelOrgId === ''
    ? await ctx.db
      .query('avatarConfigurations')
      .withIndex('by_connectedByUserId', (q) => q.eq('connectedByUserId', userId))
      .unique()
    : await ctx.db
      .query('avatarConfigurations')
      .withIndex('by_orgId', (q) => q.eq('orgId', channelOrgId))
      .unique();
}

export async function generateAvatarPublicKey(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicKey = `${PUBLIC_KEY_PREFIX}${crypto.randomUUID().replaceAll('-', '')}`;
    const existing = await ctx.db
      .query('avatarConfigurations')
      .withIndex('by_publicKey', (q) => q.eq('publicKey', publicKey))
      .unique();
    if (existing === null) return publicKey;
  }
  throw new Error('Could not generate Avatar key');
}

export function dashboardAvatarConfiguration(configuration: Doc<'avatarConfigurations'>) {
  return {
    publicKey: configuration.publicKey,
    configured: Boolean(
      configuration.avatarId
      && configuration.voiceId
      && configuration.language,
    ),
    enabled: configuration.enabled,
    avatarName: configuration.avatarName,
    avatarPreviewUrl: configuration.avatarPreviewUrl,
    voiceName: configuration.voiceName,
    voiceLanguage: configuration.voiceLanguage,
    voiceGender: configuration.voiceGender,
    language: configuration.language,
    embedUrl: configuration.providerEmbedUrl,
    embedScript: configuration.providerEmbedScript,
    updatedAt: configuration.updatedAt,
  };
}
