/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

async function setup(status: 'submitting' | 'approved' | 'failed' = 'submitting') {
  const t = convexTest(schema, modules);
  const templateIds = await t.run(async (ctx) => {
    const ids = [];
    for (let index = 0; index < 2; index += 1) {
      const channelId = await ctx.db.insert('channels', {
        orgId: `org-${index}`,
        service: 'whatsapp',
        status: 'connected',
        wabaId: 'waba-shared',
        connectedByUserId: `owner-${index}`,
        createdAt: 1,
        updatedAt: 1,
      });
      ids.push(await ctx.db.insert('whatsappTemplates', {
        orgId: `org-${index}`,
        channelId,
        name: 'welcome_offer',
        language: index === 0 ? 'en_US' : 'en-US',
        purpose: 'broadcasting',
        category: 'MARKETING',
        components: [],
        status,
        metaTemplateId: index === 0 ? 'meta-123' : undefined,
        error: status === 'failed' ? 'Rejected' : undefined,
        statusUpdatedAt: 1,
        createdAt: 1,
      }));
    }
    return ids;
  });
  return { t, templateIds };
}

describe('WhatsApp template status webhook', () => {
  test('updates every matching channel and backfills a legacy Meta ID', async () => {
    const { t, templateIds } = await setup();
    const result = await t.mutation(
      internal.whatsappTemplateWebhook.handleTemplateStatusUpdate,
      {
        wabaId: 'waba-shared',
        event: 'APPROVED',
        metaTemplateId: 'meta-123',
        name: 'welcome_offer',
        language: 'en_US',
      },
    );
    expect(result).toEqual({ matched: 2, updated: 2 });
    const rows = await t.run(async (ctx) => Promise.all(
      templateIds.map(async (id) => await ctx.db.get(id)),
    ));
    expect(rows.every((row) => row?.status === 'approved')).toBe(true);
    expect(rows.every((row) => row?.metaTemplateId === 'meta-123')).toBe(true);
  });

  test('does not downgrade an approved template with a stale pending event', async () => {
    const { t, templateIds } = await setup('approved');
    const result = await t.mutation(
      internal.whatsappTemplateWebhook.handleTemplateStatusUpdate,
      {
        wabaId: 'waba-shared',
        event: 'PENDING',
        metaTemplateId: 'meta-123',
        name: 'welcome_offer',
        language: 'en_US',
      },
    );
    expect(result).toEqual({ matched: 2, updated: 0 });
    const rows = await t.run(async (ctx) => Promise.all(
      templateIds.map(async (id) => await ctx.db.get(id)),
    ));
    expect(rows.every((row) => row?.status === 'approved')).toBe(true);
  });

  test('stores a terminal reason and is idempotent on duplicate delivery', async () => {
    const { t } = await setup();
    const args = {
      wabaId: 'waba-shared',
      event: 'REJECTED',
      metaTemplateId: 'meta-123',
      name: 'welcome_offer',
      language: 'en_US',
      reason: 'Policy violation',
    };
    expect(await t.mutation(
      internal.whatsappTemplateWebhook.handleTemplateStatusUpdate,
      args,
    )).toEqual({ matched: 2, updated: 2 });
    expect(await t.mutation(
      internal.whatsappTemplateWebhook.handleTemplateStatusUpdate,
      args,
    )).toEqual({ matched: 2, updated: 0 });
  });

  test('updates template categories and is idempotent on duplicate delivery', async () => {
    const { t, templateIds } = await setup('approved');
    const args = {
      wabaId: 'waba-shared',
      metaTemplateId: 'meta-123',
      name: 'welcome_offer',
      language: 'en-US',
      newCategory: 'UTILITY' as const,
    };
    expect(await t.mutation(
      internal.whatsappTemplateWebhook.handleTemplateCategoryUpdate,
      args,
    )).toEqual({ matched: 2, updated: 2 });
    const rows = await t.run(async (ctx) => Promise.all(
      templateIds.map(async (id) => await ctx.db.get(id)),
    ));
    expect(rows.every((row) => row?.category === 'UTILITY')).toBe(true);
    expect(rows.every((row) => row?.status === 'approved')).toBe(true);
    expect(rows.every((row) => row?.metaTemplateId === 'meta-123')).toBe(true);
    expect(await t.mutation(
      internal.whatsappTemplateWebhook.handleTemplateCategoryUpdate,
      args,
    )).toEqual({ matched: 2, updated: 0 });
  });
});
