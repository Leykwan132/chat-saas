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
  avatarBackgroundKeyPrefix,
  generateAvatarBackgroundKey,
  generateAvatarCoverKey,
  r2,
} from './media/r2';

const AVATAR_COVER_MAX_BYTES = 5_000_000;
const AVATAR_COVER_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const AVATAR_BACKGROUND_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const AVATAR_BACKGROUND_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
]);
const AVATAR_BACKGROUND_MAX_BYTES = 50_000_000;

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

function assertAvatarBackgroundUpload(mimeType: string, fileSize: number) {
  const normalizedMimeType = mimeType.trim().toLowerCase();
  const supported = AVATAR_BACKGROUND_IMAGE_MIME_TYPES.has(normalizedMimeType)
    || AVATAR_BACKGROUND_VIDEO_MIME_TYPES.has(normalizedMimeType);
  if (!supported) {
    throw new Error('Backgrounds must be PNG, JPEG, WebP, MP4, or WebM files');
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > AVATAR_BACKGROUND_MAX_BYTES) {
    throw new Error('Backgrounds must be smaller than 50 MB');
  }
  return normalizedMimeType;
}

function assertAvatarBackgroundKey(key: string, orgId: string, agentId: Id<'agents'>) {
  if (!key.startsWith(avatarBackgroundKeyPrefix(orgId, agentId))) {
    throw new Error('Invalid Avatar background');
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
    const key = generateAvatarCoverKey(configuration.orgId, configuration.agentId, mimeType);
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
      orgId: configuration.orgId,
      agentId: configuration.agentId,
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

export const generateBackgroundUploadUrl = mutation({
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
    const mimeType = assertAvatarBackgroundUpload(args.mimeType, args.fileSize);
    const key = generateAvatarBackgroundKey(configuration.orgId, configuration.agentId, mimeType);
    return await r2.generateUploadUrl(key);
  },
});

export const internalGetBackgroundSetup = internalQuery({
  args: { agentId: v.id('agents') },
  handler: async (ctx, args) => {
    const { channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const configuration = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    if (!configuration) throw new Error('Avatar configuration not found');
    return {
      configurationId: configuration._id,
      orgId: configuration.orgId,
      agentId: configuration.agentId,
    };
  },
});

export const saveBackgroundInternal = internalMutation({
  args: {
    configurationId: v.id('avatarConfigurations'),
    key: v.string(),
    mimeType: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const configuration = await ctx.db.get(args.configurationId);
    if (!configuration) throw new Error('Avatar configuration not found');
    const mimeType = assertAvatarBackgroundUpload(args.mimeType, 1);
    assertAvatarBackgroundKey(args.key, configuration.orgId, configuration.agentId);
    const previousKey = configuration.backgroundR2Key;
    await ctx.db.patch(configuration._id, {
      backgroundR2Key: args.key,
      backgroundType: mimeType.startsWith('video/') ? 'video' : 'image',
      updatedAt: Date.now(),
    });
    return previousKey ?? null;
  },
});

export const saveBackground = action({
  args: {
    agentId: v.id('agents'),
    key: v.string(),
    mimeType: v.string(),
  },
  returns: v.null(),
  handler: async (ctx: ActionCtx, args) => {
    const mimeType = assertAvatarBackgroundUpload(args.mimeType, 1);
    const setup = await ctx.runQuery(internal.avatarCover.internalGetBackgroundSetup, {
      agentId: args.agentId,
    });
    assertAvatarBackgroundKey(args.key, setup.orgId, setup.agentId);
    await r2.syncMetadata(ctx, args.key);
    const previousKey: string | null = await ctx.runMutation(
      internal.avatarCover.saveBackgroundInternal,
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

export const removeBackground = mutation({
  args: { agentId: v.id('agents') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { channelOrgId, userId } = await getAuthorizedAvatarAgent(ctx, args.agentId);
    const configuration = await getWorkspaceAvatarConfiguration(ctx, channelOrgId, userId);
    if (!configuration) throw new Error('Avatar configuration not found');
    const previousKey = configuration.backgroundR2Key;
    await ctx.db.patch(configuration._id, {
      backgroundR2Key: undefined,
      backgroundType: undefined,
      updatedAt: Date.now(),
    });
    if (previousKey) await r2.deleteObject(ctx, previousKey);
    return null;
  },
});
