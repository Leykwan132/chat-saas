/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { FOLLOW_UP_MESSAGE_REQUIRED_ERROR } from '../shared/followUpMessageReadiness';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const workosUserId = 'follow-up-owner';
const orgId = 'follow-up-org';

async function setupFollowUpFixture() {
  const testClient = convexTest(schema, modules);
  const authenticatedClient = testClient.withIdentity({ subject: workosUserId, orgId });
  const { agentId, channelId, incompleteRuleId } = await testClient.run(async (ctx) => {
    const now = Date.now();
    const { ensureOrganizationalTeam, ensureUserAccount, setActiveTeamForUser } = await import(
      './teamHelpers'
    );
    const userId = await ensureUserAccount(ctx, {
      workosUserId,
      email: 'follow-up-owner@example.com',
    });
    const teamId = await ensureOrganizationalTeam(ctx, {
      workosOrgId: orgId,
      name: 'Follow-up Team',
      ownerUserId: userId,
    });
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new Error('Follow-up fixture user was not created');
    }
    await setActiveTeamForUser(ctx, user, teamId);
    const agentId = await ctx.db.insert('agents', {
      name: 'Follow-up Agent',
      provider: 'google',
      model: 'gemini-2.5',
      systemPrompt: 'Follow up prompt',
      templateKey: 'blank',
      fileSize: 0,
      userId: workosUserId,
      orgId,
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert('channels', {
      orgId,
      service: 'whatsapp',
      phoneNumberId: 'phone-id',
      accessToken: 'access-token',
      status: 'connected',
      connectedByUserId: workosUserId,
      createdAt: now,
      updatedAt: now,
    });
    const incompleteRuleId = await ctx.db.insert('followUpRules', {
      agentId,
      orgId,
      channelId,
      name: 'Paused draft',
      attempts: [{ attemptNumber: 1, templateName: '', templateLanguage: 'en' }],
      maxAttempts: 1,
      triggerDelayHours: 24,
      intervalHours: 24,
      audienceLeadTemperatures: ['Hot'],
      isActive: false,
      messagesSentCount: 0,
      repliesReceivedCount: 0,
      estimatedCostPerCustomer: 0,
      createdBy: workosUserId,
      createdAt: now,
      updatedAt: now,
    });
    return { agentId, channelId, incompleteRuleId };
  });
  return { testClient, authenticatedClient, agentId, channelId, incompleteRuleId };
}

test('rejects creating an active follow-up without a selected message', async () => {
  const { authenticatedClient, agentId, channelId } = await setupFollowUpFixture();

  await expect(authenticatedClient.mutation(api.whatsappFollowUp.createFollowUpRule, {
    agentId,
    channelId,
    name: 'Missing message',
    attempts: [{ attemptNumber: 1, templateName: '', templateLanguage: 'en' }],
    maxAttempts: 1,
    triggerDelayHours: 24,
    intervalHours: 24,
    audienceLeadTemperatures: ['Hot'],
    isActive: true,
    estimatedCostPerCustomer: 0,
  })).rejects.toThrow(FOLLOW_UP_MESSAGE_REQUIRED_ERROR);
});

test('rejects activating an incomplete follow-up and leaves it inactive', async () => {
  const { testClient, authenticatedClient, incompleteRuleId } = await setupFollowUpFixture();

  await expect(authenticatedClient.mutation(api.whatsappFollowUp.setFollowUpRuleActive, {
    id: incompleteRuleId,
    isActive: true,
  })).rejects.toThrow(FOLLOW_UP_MESSAGE_REQUIRED_ERROR);

  const rule = await testClient.run(async (ctx) => await ctx.db.get(incompleteRuleId));
  expect(rule?.isActive).toBe(false);
});

test('allows saving an incomplete follow-up while it remains inactive', async () => {
  const { authenticatedClient, incompleteRuleId } = await setupFollowUpFixture();

  await expect(authenticatedClient.mutation(api.whatsappFollowUp.updateFollowUpRule, {
    id: incompleteRuleId,
    name: 'Paused draft',
    attempts: [{ attemptNumber: 1, templateName: '', templateLanguage: 'en' }],
    maxAttempts: 1,
    triggerDelayHours: 24,
    intervalHours: 24,
    audienceLeadTemperatures: ['Hot'],
    isActive: false,
    estimatedCostPerCustomer: 0,
  })).resolves.toEqual({ success: true });
});
