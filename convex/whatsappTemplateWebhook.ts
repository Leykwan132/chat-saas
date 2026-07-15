import { v } from 'convex/values';
import { internalMutation, type MutationCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import {
  canApplyMetaTemplateStatus,
  mapMetaTemplateEvent,
  normalizeWhatsAppTemplateLanguage,
} from './whatsappTemplateLifecycle';

async function findTemplate(
  ctx: MutationCtx,
  channelId: Doc<'channels'>['_id'],
  args: { metaTemplateId?: string; name: string; language: string },
) {
  if (args.metaTemplateId) {
    const byId = await ctx.db
      .query('whatsappTemplates')
      .withIndex('by_channelId_and_metaTemplateId', (q) =>
        q.eq('channelId', channelId).eq('metaTemplateId', args.metaTemplateId),
      )
      .unique();
    if (byId !== null) return byId;
  }
  const candidates = await ctx.db
    .query('whatsappTemplates')
    .withIndex('by_channelId_and_name_and_language', (q) =>
      q.eq('channelId', channelId).eq('name', args.name.trim()),
    )
    .take(20);
  const language = normalizeWhatsAppTemplateLanguage(args.language);
  return candidates.find(
    (template) => normalizeWhatsAppTemplateLanguage(template.language) === language,
  ) ?? null;
}

export const handleTemplateStatusUpdate = internalMutation({
  args: {
    wabaId: v.string(),
    event: v.string(),
    metaTemplateId: v.optional(v.string()),
    name: v.string(),
    language: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transition = mapMetaTemplateEvent(args.event, args.reason);
    if (transition === null) return { matched: 0, updated: 0 };
    const channels = await ctx.db
      .query('channels')
      .withIndex('by_wabaId', (q) => q.eq('wabaId', args.wabaId.trim()))
      .take(50);
    let matched = 0;
    let updated = 0;
    for (const channel of channels) {
      const template = await findTemplate(ctx, channel._id, {
        metaTemplateId: args.metaTemplateId?.trim() || undefined,
        name: args.name,
        language: args.language,
      });
      if (template === null) continue;
      matched += 1;
      if (!canApplyMetaTemplateStatus(template.status, transition.status)) continue;
      const metaTemplateId = args.metaTemplateId?.trim() || template.metaTemplateId;
      if (
        template.status === transition.status &&
        template.error === transition.error &&
        template.metaTemplateId === metaTemplateId
      ) continue;
      await ctx.db.patch(template._id, {
        status: transition.status,
        error: transition.error,
        metaTemplateId,
        statusUpdatedAt: Date.now(),
      });
      updated += 1;
    }
    return { matched, updated };
  },
});

export const handleTemplateCategoryUpdate = internalMutation({
  args: {
    wabaId: v.string(),
    metaTemplateId: v.optional(v.string()),
    name: v.string(),
    language: v.string(),
    newCategory: v.union(v.literal('MARKETING'), v.literal('UTILITY')),
  },
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query('channels')
      .withIndex('by_wabaId', (q) => q.eq('wabaId', args.wabaId.trim()))
      .take(50);
    let matched = 0;
    let updated = 0;
    for (const channel of channels) {
      const template = await findTemplate(ctx, channel._id, {
        metaTemplateId: args.metaTemplateId?.trim() || undefined,
        name: args.name,
        language: args.language,
      });
      if (template === null) continue;
      matched += 1;
      const metaTemplateId = args.metaTemplateId?.trim() || template.metaTemplateId;
      if (template.category === args.newCategory && template.metaTemplateId === metaTemplateId) continue;
      await ctx.db.patch(template._id, { category: args.newCategory, metaTemplateId });
      updated += 1;
    }
    return { matched, updated };
  },
});
