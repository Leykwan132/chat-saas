import { v } from 'convex/values';
import { internalQuery, query, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { getAuthContext, resolveChannelOrgId } from './authUtils';
import { projectWhatsAppTemplate } from './whatsappTemplateLifecycle';

async function requireOrgWhatsAppChannel(
  ctx: QueryCtx,
  channelId: Id<'channels'>,
) {
  const { orgId, userId } = await getAuthContext(ctx);
  const resolvedOrgId = resolveChannelOrgId(orgId, userId);
  const channel = await ctx.db.get(channelId);
  if (channel === null || channel.orgId !== resolvedOrgId) {
    throw new Error('Channel not found');
  }
  if (channel.service !== 'whatsapp') {
    throw new Error('Not a WhatsApp channel');
  }
  return resolvedOrgId;
}

export const listForChannel = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    const orgId = await requireOrgWhatsAppChannel(ctx, args.channelId);
    const templates = await ctx.db
      .query('whatsappTemplates')
      .withIndex('by_orgId_and_channelId', (q) =>
        q.eq('orgId', orgId).eq('channelId', args.channelId),
      )
      .order('desc')
      .take(200);
    return templates.map(projectWhatsAppTemplate);
  },
});

export const listApprovedForChannel = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    const orgId = await requireOrgWhatsAppChannel(ctx, args.channelId);
    const templates = await ctx.db
      .query('whatsappTemplates')
      .withIndex('by_orgId_and_channelId_and_status', (q) =>
        q
          .eq('orgId', orgId)
          .eq('channelId', args.channelId)
          .eq('status', 'approved'),
      )
      .order('desc')
      .take(200);
    return templates.map(projectWhatsAppTemplate);
  },
});

export const getForChannelByNameAndLanguage = query({
  args: {
    channelId: v.id('channels'),
    name: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgWhatsAppChannel(ctx, args.channelId);
    const template = await ctx.db
      .query('whatsappTemplates')
      .withIndex('by_channelId_and_name_and_language', (q) =>
        q
          .eq('channelId', args.channelId)
          .eq('name', args.name.trim())
          .eq('language', args.language.trim()),
      )
      .unique();
    return template === null ? null : projectWhatsAppTemplate(template);
  },
});

export const getById = internalQuery({
  args: { templateId: v.id('whatsappTemplates') },
  handler: async (ctx, args) => await ctx.db.get(args.templateId),
});

export const getChannelById = internalQuery({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => await ctx.db.get(args.channelId),
});

export const getByChannelAndNameAndLanguage = internalQuery({
  args: {
    channelId: v.id('channels'),
    name: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => await ctx.db
    .query('whatsappTemplates')
    .withIndex('by_channelId_and_name_and_language', (q) =>
      q
        .eq('channelId', args.channelId)
        .eq('name', args.name.trim())
        .eq('language', args.language.trim()),
    )
    .unique(),
});

export const getByChannelAndMetaTemplateId = internalQuery({
  args: {
    channelId: v.id('channels'),
    metaTemplateId: v.string(),
  },
  handler: async (ctx, args) => await ctx.db
    .query('whatsappTemplates')
    .withIndex('by_channelId_and_metaTemplateId', (q) =>
      q.eq('channelId', args.channelId).eq('metaTemplateId', args.metaTemplateId),
    )
    .unique(),
});
