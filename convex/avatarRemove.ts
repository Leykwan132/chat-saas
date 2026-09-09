import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { getAuthorizedAvatarAgent, getWorkspaceAvatarConfiguration } from './avatarCore';
import { r2 } from './media/r2';

export const remove = mutation({
  args: { agentId: v.id('agents') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const configuration = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    if (!configuration) throw new Error('Avatar configuration not found');
    const coverKey = configuration.coverImageR2Key;
    const backgroundKey = configuration.backgroundR2Key;
    await ctx.db.patch(configuration._id, {
      enabled: false,
      avatarId: undefined,
      avatarName: undefined,
      avatarPreviewUrl: undefined,
      coverImageR2Key: undefined,
      coverImageType: undefined,
      backgroundR2Key: undefined,
      backgroundType: undefined,
      voiceId: undefined,
      voiceName: undefined,
      voiceLanguage: undefined,
      voiceGender: undefined,
      providerContextId: undefined,
      providerContextPrompt: undefined,
      providerContextOpeningText: undefined,
      providerEmbedId: undefined,
      providerEmbedUrl: undefined,
      providerEmbedScript: undefined,
      providerEmbedSandbox: undefined,
      embedCreatedAt: undefined,
      updatedAt: Date.now(),
    });
    if (coverKey) await r2.deleteObject(ctx, coverKey);
    if (backgroundKey) await r2.deleteObject(ctx, backgroundKey);
    return null;
  },
});
