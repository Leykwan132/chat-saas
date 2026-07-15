/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

async function seed(metaTemplateId?: string) {
  const t = convexTest(schema, modules);
  const { channelId, templateId } = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert('channels', {
      orgId: 'org-update',
      service: 'whatsapp',
      status: 'connected',
      connectedByUserId: 'owner',
      createdAt: 1,
      updatedAt: 1,
    });
    const templateId = await ctx.db.insert('whatsappTemplates', {
      orgId: 'org-update',
      channelId,
      name: 'offer',
      language: 'en_US',
      purpose: 'broadcasting',
      category: 'MARKETING',
      components: [{ type: 'BODY', text: 'Old body' }],
      status: 'approved',
      metaTemplateId,
      statusUpdatedAt: 1,
      createdAt: 1,
    });
    return { channelId, templateId };
  });
  return { t, channelId, templateId };
}

describe('local WhatsApp template update start', () => {
  test('uses the stored Meta ID and moves the local record to submitting', async () => {
    const { t, channelId, templateId } = await seed('meta-42');
    const result = await t.mutation(internal.whatsappTemplates.beginTemplateUpdate, {
      orgId: 'org-update',
      channelId,
      name: 'offer',
      language: 'en_US',
      category: 'UTILITY',
      components: [{ type: 'BODY', text: 'New body' }],
    });
    expect(result).toEqual({ templateId, metaTemplateId: 'meta-42' });
    const template = await t.run(async (ctx) => await ctx.db.get(templateId));
    expect(template).toMatchObject({
      status: 'submitting',
      category: 'UTILITY',
      components: [{ type: 'BODY', text: 'New body' }],
    });
  });

  test('fails explicitly when the local Meta ID is missing', async () => {
    const { t, channelId } = await seed();
    await expect(t.mutation(internal.whatsappTemplates.beginTemplateUpdate, {
      orgId: 'org-update',
      channelId,
      name: 'offer',
      language: 'en_US',
      category: 'MARKETING',
      components: [{ type: 'BODY', text: 'New body' }],
    })).rejects.toThrow('Template has no Meta template ID.');
  });
});
