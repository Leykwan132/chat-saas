/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

async function setup() {
  const t = convexTest(schema, modules);
  const workosUserId = 'template-query-owner';
  const channelId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {
      workosUserId,
      email: 'owner@example.com',
      createdAt: 1,
      updatedAt: 1,
    });
    const teamId = await ctx.db.insert('teams', {
      type: 'personal',
      name: 'Personal Workspace',
      ownerId: userId,
      createdAt: 1,
      updatedAt: 1,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    return await ctx.db.insert('channels', {
      orgId: '',
      service: 'whatsapp',
      status: 'connected',
      wabaId: 'waba-query',
      phoneNumberId: 'phone-query',
      accessToken: 'token-query',
      connectedByUserId: workosUserId,
      createdAt: 1,
      updatedAt: 1,
    });
  });
  return { t, channelId, authed: t.withIdentity({ subject: workosUserId }) };
}

describe('local WhatsApp template queries', () => {
  test('returns all management statuses and approved-only selectors', async () => {
    const { t, channelId, authed } = await setup();
    await t.run(async (ctx) => {
      for (const [index, status] of [
        'submitting',
        'submitted',
        'in_review',
        'approved',
        'failed',
      ].entries()) {
        await ctx.db.insert('whatsappTemplates', {
          orgId: '',
          channelId,
          name: `${status}_template`,
          language: 'en_US',
          purpose: 'broadcasting',
          category: 'MARKETING',
          components: [],
          status: status as 'submitting' | 'submitted' | 'in_review' | 'approved' | 'failed',
          createdAt: index + 1,
          statusUpdatedAt: index + 1,
        });
      }
    });

    const management = await authed.query(
      api.whatsappTemplateQueries.listForChannel,
      { channelId },
    );
    expect(management).toHaveLength(5);

    const approved = await authed.query(
      api.whatsappTemplateQueries.listApprovedForChannel,
      { channelId },
    );
    expect(approved.map((template) => template.name)).toEqual(['approved_template']);
  });

  test('returns one exact local template', async () => {
    const { t, channelId, authed } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.insert('whatsappTemplates', {
        orgId: '',
        channelId,
        name: 'welcome_offer',
        language: 'en_US',
        purpose: 'broadcasting',
        category: 'MARKETING',
        components: [{ type: 'BODY', text: 'Welcome' }],
        status: 'approved',
        metaTemplateId: 'meta-welcome',
        statusUpdatedAt: 2,
        createdAt: 1,
      });
    });

    const template = await authed.query(
      api.whatsappTemplateQueries.getForChannelByNameAndLanguage,
      { channelId, name: 'welcome_offer', language: 'en_US' },
    );
    expect(template).toMatchObject({
      name: 'welcome_offer',
      status: 'approved',
      metaTemplateId: 'meta-welcome',
    });
  });

  test('bounds management results to 200 newest records', async () => {
    const { t, channelId, authed } = await setup();
    await t.run(async (ctx) => {
      for (let index = 0; index < 205; index += 1) {
        await ctx.db.insert('whatsappTemplates', {
          orgId: '',
          channelId,
          name: `template_${index}`,
          language: 'en_US',
          purpose: 'broadcasting',
          category: 'MARKETING',
          components: [],
          status: 'approved',
          statusUpdatedAt: index,
          createdAt: index,
        });
      }
    });

    const templates = await authed.query(
      api.whatsappTemplateQueries.listForChannel,
      { channelId },
    );
    expect(templates).toHaveLength(200);
    expect(templates[0].name).toBe('template_204');
  });
});
