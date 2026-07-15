/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

async function setup(status?: 'submitting' | 'submitted' | 'in_review' | 'approved' | 'failed') {
  const t = convexTest(schema, modules);
  const channelId = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert('channels', {
      orgId: 'org-send',
      service: 'whatsapp',
      status: 'connected',
      connectedByUserId: 'owner',
      createdAt: 1,
      updatedAt: 1,
    });
    if (status) {
      await ctx.db.insert('whatsappTemplates', {
        orgId: 'org-send',
        channelId,
        name: 'approved_offer',
        language: 'en_US',
        purpose: 'broadcasting',
        category: 'MARKETING',
        components: [{ type: 'BODY', text: 'Hello' }],
        status,
        statusUpdatedAt: 1,
        createdAt: 1,
      });
    }
    return channelId;
  });
  return { t, channelId };
}

async function getContext(
  status?: 'submitting' | 'submitted' | 'in_review' | 'approved' | 'failed',
) {
  const { t, channelId } = await setup(status);
  return await t.query(
    internal.whatsappTemplateSendPayload.getTemplateSendPayloadContext,
    {
      orgId: 'org-send',
      channelId,
      templateName: 'approved_offer',
      templateLanguage: 'en_US',
    },
  );
}

describe('WhatsApp template send approval', () => {
  test('returns payload context for an approved local template', async () => {
    const context = await getContext('approved');
    expect(context.template?.status).toBe('approved');
  });

  test.each(['submitting', 'submitted', 'in_review', 'failed', undefined] as const)(
    'rejects %s templates',
    async (status) => {
      await expect(getContext(status)).rejects.toThrow(
        'WhatsApp template is not approved.',
      );
    },
  );
});
