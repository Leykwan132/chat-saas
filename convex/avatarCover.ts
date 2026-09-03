import { v } from 'convex/values';
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  type ActionCtx,
} from './_generated/server';
import type { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import {
  getAuthorizedAvatarAgent,
  getWorkspaceAvatarConfiguration,
} from './avatarCore';
import {
  avatarCoverKeyPrefix,
  generateAvatarCoverKey,
  r2,
} from './media/r2';

const AVATAR_COVER_MAX_BYTES = 5_000_000;
const AVATAR_COVER_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

function assertAvatarCoverUpload(mimeType: string, fileSize: number) {
  const normalizedMimeType = mimeType.trim().toLowerCase();
  if (!AVATAR_COVER_MIME_TYPES.has(normalizedMimeType)) {
    throw new Error('Cover images must be PNG, JPEG, or WebP files');
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > AVATAR_COVER_MAX_BYTES) {
    throw new Error('Cover images must be smaller than 5 MB');
  }
  return normalizedMimeType;
}

function assertAvatarCoverKey(key: string, orgId: string, agentId: Id<'agents'>) {
  if (!key.startsWith(avatarCoverKeyPrefix(orgId, agentId))) {
    throw new Error('Invalid Avatar cover image');
  }
}

export const generateCoverUploadUrl = mutation({
  args: {
    agentId: v.id('agents'),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  returns: v.object({ key: v.string(), url: v.string() }),
  handler: async (ctx, args) => {
    const { channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const configuration = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    if (!configuration) throw new Error('Avatar configuration not found');
    const mimeType = assertAvatarCoverUpload(args.mimeType, args.fileSize);
    const key = generateAvatarCoverKey(channelOrgId, args.agentId, mimeType);
    return await r2.generateUploadUrl(key);
  },
});

export const internalGetCoverSetup = internalQuery({
  args: { agentId: v.id('agents') },
  handler: async (ctx, args) => {
    const { channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const configuration = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    if (!configuration) throw new Error('Avatar configuration not found');
    return {
      configurationId: configuration._id,
      orgId: channelOrgId,
      agentId: args.agentId,
    };
  },
});

export const saveCoverImageInternal = internalMutation({
  args: {
    configurationId: v.id('avatarConfigurations'),
    key: v.string(),
    mimeType: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const configuration = await ctx.db.get(args.configurationId);
    if (!configuration) throw new Error('Avatar configuration not found');
    if (!AVATAR_COVER_MIME_TYPES.has(args.mimeType.trim().toLowerCase())) {
      throw new Error('Cover images must be PNG, JPEG, or WebP files');
    }
    assertAvatarCoverKey(args.key, configuration.orgId, configuration.agentId);
    const previousKey = configuration.coverImageR2Key;
    await ctx.db.patch(configuration._id, {
      coverImageR2Key: args.key,
      updatedAt: Date.now(),
    });
    return previousKey ?? null;
  },
});

export const saveCoverImage = action({
  args: {
    agentId: v.id('agents'),
    key: v.string(),
    mimeType: v.string(),
  },
  returns: v.null(),
  handler: async (ctx: ActionCtx, args) => {
    const mimeType = args.mimeType.trim().toLowerCase();
    if (!AVATAR_COVER_MIME_TYPES.has(mimeType)) {
      throw new Error('Cover images must be PNG, JPEG, or WebP files');
    }
    const setup = await ctx.runQuery(internal.avatarCover.internalGetCoverSetup, {
      agentId: args.agentId,
    });
    assertAvatarCoverKey(args.key, setup.orgId, setup.agentId);
    await r2.syncMetadata(ctx, args.key);
    const previousKey: string | null = await ctx.runMutation(
      internal.avatarCover.saveCoverImageInternal,
      {
        configurationId: setup.configurationId,
        key: args.key,
        mimeType,
      },
    );
    if (previousKey && previousKey !== args.key) await r2.deleteObject(ctx, previousKey);
    return null;
  },
});

export const removeCoverImage = mutation({
  args: { agentId: v.id('agents') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const configuration = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    if (!configuration) throw new Error('Avatar configuration not found');
    const previousKey = configuration.coverImageR2Key;
    await ctx.db.patch(configuration._id, {
      coverImageR2Key: undefined,
      updatedAt: Date.now(),
    });
    if (previousKey) await r2.deleteObject(ctx, previousKey);
    return null;
  },
});
