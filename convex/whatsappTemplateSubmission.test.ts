/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

async function seedTemplate(status: 'submitting' | 'approved' | 'failed') {
  const t = convexTest(schema, modules);
  const templateId = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert('channels', {
      orgId: 'org-template',
      service: 'whatsapp',
      status: 'connected',
      connectedByUserId: 'template-owner',
      createdAt: 1,
      updatedAt: 1,
    });
    return await ctx.db.insert('whatsappTemplates', {
      orgId: 'org-template',
      channelId,
      name: 'welcome',
      language: 'en_US',
      purpose: 'broadcasting',
      category: 'MARKETING',
      components: [],
      status,
      error: status === 'failed' ? 'Rejected' : undefined,
      statusUpdatedAt: 1,
      createdAt: 1,
    });
  });
  return { t, templateId };
}

describe('WhatsApp template submission mutations', () => {
  test('successful submission becomes in review and stores the Meta ID', async () => {
    const { t, templateId } = await seedTemplate('submitting');
    await t.mutation(internal.whatsappTemplates.completeTemplateSubmission, {
      templateId,
      metaTemplateId: 'meta-123',
    });
    const template = await t.run(async (ctx) => await ctx.db.get(templateId));
    expect(template).toMatchObject({
      status: 'in_review',
      metaTemplateId: 'meta-123',
    });
    expect(template?.error).toBeUndefined();
  });

  test('delayed completion does not overwrite webhook approval', async () => {
    const { t, templateId } = await seedTemplate('approved');
    await t.mutation(internal.whatsappTemplates.completeTemplateSubmission, {
      templateId,
      metaTemplateId: 'meta-123',
    });
    const template = await t.run(async (ctx) => await ctx.db.get(templateId));
    expect(template).toMatchObject({ status: 'approved', metaTemplateId: 'meta-123' });
  });

  test('submission failure records the error', async () => {
    const { t, templateId } = await seedTemplate('submitting');
    await t.mutation(internal.whatsappTemplates.failTemplateSubmission, {
      templateId,
      error: 'Meta rejected the request',
    });
    const template = await t.run(async (ctx) => await ctx.db.get(templateId));
    expect(template).toMatchObject({
      status: 'failed',
      error: 'Meta rejected the request',
    });
  });

  test('delayed request failure does not overwrite webhook approval', async () => {
    const { t, templateId } = await seedTemplate('approved');
    await t.mutation(internal.whatsappTemplates.failTemplateSubmission, {
      templateId,
      error: 'Late transport failure',
    });
    const template = await t.run(async (ctx) => await ctx.db.get(templateId));
    expect(template).toMatchObject({ status: 'approved' });
    expect(template?.error).toBeUndefined();
  });
});
