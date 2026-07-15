/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test, vi } from 'vitest';
import workpoolSchema from '../node_modules/@convex-dev/workpool/dist/component/schema.js';
import schema from './schema';
import {
  cancelWorkflowFollowUpForConversation,
  handleWorkflowFollowUpOutbound,
} from './workflowFollowUpRuntime';

const modules = import.meta.glob('./**/*.ts');
const workpoolModules = {
  complete: () => import('../node_modules/@convex-dev/workpool/dist/component/complete.js'),
  config: () => import('../node_modules/@convex-dev/workpool/dist/component/config.js'),
  crons: () => import('../node_modules/@convex-dev/workpool/dist/component/crons.js'),
  danger: () => import('../node_modules/@convex-dev/workpool/dist/component/danger.js'),
  kick: () => import('../node_modules/@convex-dev/workpool/dist/component/kick.js'),
  lib: () => import('../node_modules/@convex-dev/workpool/dist/component/lib.js'),
  logging: () => import('../node_modules/@convex-dev/workpool/dist/component/logging.js'),
  loop: () => import('../node_modules/@convex-dev/workpool/dist/component/loop.js'),
  recovery: () => import('../node_modules/@convex-dev/workpool/dist/component/recovery.js'),
  stats: () => import('../node_modules/@convex-dev/workpool/dist/component/stats.js'),
  worker: () => import('../node_modules/@convex-dev/workpool/dist/component/worker.js'),
  '_generated/server': () => import('../node_modules/@convex-dev/workpool/dist/component/_generated/server.js'),
};

test('maintains one follow-up timer, updates its baseline, and cancels on reply', async () => {
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const t = convexTest(schema, modules);
  t.registerComponent('workflowFollowUpWorkpool', workpoolSchema, workpoolModules);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert('agents', {
      name: 'Follow-up Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Test',
      templateKey: 'blank',
      fileSize: 0,
      userId: 'follow-up-owner',
      orgId: 'org',
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert('channels', {
      orgId: 'org',
      service: 'whatsapp',
      phoneNumberId: 'phone-number',
      accessToken: 'token',
      status: 'connected',
      connectedByUserId: 'follow-up-owner',
      defaultAgentId: agentId,
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert('customers', {
      orgId: 'org',
      agentId,
      service: 'whatsapp',
      contactAddress: '+60123456789',
      tags: ['vip'],
      leadTemperature: 'Warm',
      source: 'whatsapp',
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert('conversations', {
      orgId: 'org',
      channelId,
      service: 'whatsapp',
      orgAddress: 'business',
      contactAddress: '+60123456789',
      customerId,
      status: 'open',
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: 'follow-up-thread',
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('workflows', {
      agentId,
      orgId: 'org',
      userId: 'follow-up-owner',
      name: 'Workflow',
      followUpAutomation: {
        enabled: true,
        activationScope: 'futureOnly',
        revision: 2,
        selections: {},
        audienceFilters: ['lead:Warm'],
        startAfterMinutes: 15,
        intervalHours: 24,
        maxAttempts: 3,
        messageStrategy: 'same',
        sameTemplate: {
          key: 'follow_up\ten_US',
          name: 'follow_up',
          language: 'en_US',
          category: 'MARKETING',
          components: [],
        },
        attemptTemplates: [],
      },
      createdAt: now,
      updatedAt: now,
    });
    const firstMessageId = await ctx.db.insert('messages', {
      orgId: 'org',
      conversationId,
      channelId,
      service: 'whatsapp',
      orgAddress: 'business',
      contactAddress: '+60123456789',
      direction: 'outgoing',
      authorUserId: 'follow-up-owner',
      contentType: 'text',
      content: 'Hello',
      status: 'sent',
      createdAt: now,
    });
    const secondMessageId = await ctx.db.insert('messages', {
      orgId: 'org',
      conversationId,
      channelId,
      service: 'whatsapp',
      orgAddress: 'business',
      contactAddress: '+60123456789',
      direction: 'outgoing',
      authorUserId: 'follow-up-owner',
      contentType: 'text',
      content: 'More details',
      status: 'sent',
      createdAt: now + 1_000,
    });
    return { conversationId, firstMessageAt: now, firstMessageId, secondMessageId };
  });
  await t.run((ctx) => handleWorkflowFollowUpOutbound(ctx, fixture.firstMessageId));
  expect(consoleLog).toHaveBeenCalledWith(
    'workflow_followup_workpool_scheduled',
    expect.objectContaining({
      conversationId: fixture.conversationId,
      attempt: 1,
      templateName: 'follow_up',
    }),
  );
  await t.run(async (ctx) => {
    const timer = await ctx.db.query('workflowFollowUpTimers').unique();
    expect(timer?.dueAt).toBe(fixture.firstMessageAt + 15 * 60 * 1000);
  });
  await t.run((ctx) => handleWorkflowFollowUpOutbound(ctx, fixture.secondMessageId));
  await t.run(async (ctx) => {
    const timers = await ctx.db.query('workflowFollowUpTimers').collect();
    const runs = await ctx.db.query('workflowAutomationRuns').collect();
    expect(timers).toHaveLength(1);
    expect(runs).toHaveLength(1);
    expect(timers[0].latestOutboundMessageId).toBe(fixture.secondMessageId);
    expect(timers[0].workIds).toHaveLength(1);
    expect(runs[0].sourceMessageId).toBe(fixture.secondMessageId);
  });
  await t.run((ctx) => cancelWorkflowFollowUpForConversation(
    ctx,
    fixture.conversationId,
    'Customer replied',
  ));
  await t.run(async (ctx) => {
    const timer = await ctx.db.query('workflowFollowUpTimers').unique();
    const run = await ctx.db.query('workflowAutomationRuns').unique();
    expect(timer?.status).toBe('closed');
    expect(run?.status).toBe('cancelled');
  });
  await t.run(async (ctx) => {
    const workflow = await ctx.db.query('workflows').unique();
    if (!workflow?.followUpAutomation) throw new Error('Follow-up configuration not found');
    await ctx.db.patch(workflow._id, {
      followUpAutomation: {
        ...workflow.followUpAutomation,
        enabled: false,
      },
      updatedAt: Date.now(),
    });
  });
  const disabledResult = await t.run((ctx) => (
    handleWorkflowFollowUpOutbound(ctx, fixture.secondMessageId)
  ));
  expect(disabledResult).toBe(false);
  await t.run(async (ctx) => {
    expect(await ctx.db.query('workflowFollowUpTimers').collect()).toHaveLength(1);
    expect(await ctx.db.query('workflowAutomationRuns').collect()).toHaveLength(1);
  });
  consoleLog.mockRestore();
});
