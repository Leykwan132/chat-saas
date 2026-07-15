/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import agentSchema from '../node_modules/@convex-dev/agent/dist/component/schema.js';
import schema from './schema';
import {
  projectWorkflowAutomationOutbound,
  recordWorkflowAutomationOutbound,
} from './workflowAutomationOutbound';

const modules = import.meta.glob('./**/*.ts');

function registerAgent(t: ReturnType<typeof convexTest>) {
  t.registerComponent('agent', agentSchema, {
    apiKeys: () => import('../node_modules/@convex-dev/agent/dist/component/apiKeys.js'),
    files: () => import('../node_modules/@convex-dev/agent/dist/component/files.js'),
    messages: () => import('../node_modules/@convex-dev/agent/dist/component/messages.js'),
    streams: () => import('../node_modules/@convex-dev/agent/dist/component/streams.js'),
    threads: () => import('../node_modules/@convex-dev/agent/dist/component/threads.js'),
    users: () => import('../node_modules/@convex-dev/agent/dist/component/users.js'),
    '_generated/server': () => import('../node_modules/@convex-dev/agent/dist/component/_generated/server.js'),
  });
}

test('projects exact reminder content and Action History metadata', () => {
  expect(projectWorkflowAutomationOutbound({
    automationKind: 'reminder',
    runId: 'run-reminder',
    attempt: 1,
    templateName: 'appointment_reminder',
    result: {
      providerMessageId: 'wamid.reminder',
      renderedContent: 'Hi Aina, your appointment is tomorrow at 10:00 am.',
    },
  })).toEqual({
    action: 'reminder_sent',
    content: 'Hi Aina, your appointment is tomorrow at 10:00 am.',
    files: [],
    images: [],
    logMetadata: {
      message: 'Hi Aina, your appointment is tomorrow at 10:00 am.',
      runId: 'run-reminder',
      templateName: 'appointment_reminder',
    },
    providerMessageId: 'wamid.reminder',
    source: 'workflowReminder',
  });
});

test('projects follow-up media and attempt metadata', () => {
  expect(projectWorkflowAutomationOutbound({
    automationKind: 'followUp',
    runId: 'run-follow-up',
    attempt: 2,
    templateName: 'follow_up',
    result: {
      providerMessageId: 'wamid.followup',
      renderedContent: 'Are you still interested?',
      headerAsset: {
        url: 'https://example.com/catalog.jpg',
        mimeType: 'image/jpeg',
        filename: 'catalog.jpg',
        headerFormat: 'IMAGE',
      },
    },
  })).toEqual({
    action: 'followup_sent',
    content: 'Are you still interested?',
    files: [],
    images: [{ url: 'https://example.com/catalog.jpg', mimeType: 'image/jpeg' }],
    logMetadata: {
      attemptNumber: 2,
      message: 'Are you still interested?',
      runId: 'run-follow-up',
      templateName: 'follow_up',
    },
    providerMessageId: 'wamid.followup',
    source: 'workflowFollowUp',
  });
});

test('rejects a send with no resolved text or media', () => {
  expect(() => projectWorkflowAutomationOutbound({
    automationKind: 'reminder',
    runId: 'run-empty',
    attempt: 1,
    templateName: 'empty_template',
    result: { renderedContent: '   ' },
  })).toThrow('Workflow automation send has no resolved content');
});

test('preserves the provider-facing message text exactly', () => {
  const projected = projectWorkflowAutomationOutbound({
    automationKind: 'reminder',
    runId: 'run-exact',
    attempt: 1,
    templateName: 'exact_template',
    result: { renderedContent: '  Keep these boundaries.\n' },
  });

  expect(projected.content).toBe('  Keep these boundaries.\n');
  expect(projected.logMetadata.message).toBe('  Keep these boundaries.\n');
});

test('records a successful reminder in the channel ledger and Action History', async () => {
  const t = convexTest(schema, modules);
  registerAgent(t);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert('agents', {
      name: 'Workflow Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Test',
      templateKey: 'blank',
      fileSize: 0,
      userId: 'owner',
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
      connectedByUserId: 'owner',
      defaultAgentId: agentId,
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert('customers', {
      orgId: 'org',
      agentId,
      service: 'whatsapp',
      contactAddress: '+60123456789',
      tags: [],
      source: 'whatsapp',
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const { createThreadForConversation } = await import('./chat/threads');
    const threadId = await createThreadForConversation(ctx, {
      orgId: 'org',
      contactName: 'Aina',
      contactAddress: '+60123456789',
      service: 'whatsapp',
    });
    const conversationId = await ctx.db.insert('conversations', {
      orgId: 'org',
      channelId,
      service: 'whatsapp',
      orgAddress: 'phone-number',
      contactAddress: '+60123456789',
      contactName: 'Aina',
      customerId,
      status: 'open',
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId,
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const workflowId = await ctx.db.insert('workflows', {
      agentId,
      orgId: 'org',
      userId: 'owner',
      name: 'Workflow',
      createdAt: now,
      updatedAt: now,
    });
    const runId = await ctx.db.insert('workflowAutomationRuns', {
      workflowId,
      agentId,
      orgId: 'org',
      automationKind: 'reminder',
      subjectType: 'appointment',
      subjectKey: 'appointment-1',
      deduplicationKey: 'reminder:appointment-1',
      conversationId,
      customerId,
      channelId,
      configurationRevision: 1,
      activationScope: 'futureOnly',
      attempt: 1,
      scheduledAt: now,
      status: 'scheduled',
      workIds: [],
      templateSnapshot: {
        key: 'appointment_reminder\ten_US',
        name: 'appointment_reminder',
        language: 'en_US',
        category: 'UTILITY',
      },
      createdAt: now,
      updatedAt: now,
    });
    return { conversationId, runId };
  });

  await t.run(async (ctx) => {
    const run = await ctx.db.get(fixture.runId);
    if (!run) throw new Error('Fixture run is unavailable');
    await recordWorkflowAutomationOutbound(ctx, {
      run,
      result: {
        providerMessageId: 'wamid.reminder',
        renderedContent: 'Hi Aina, your appointment is tomorrow at 10:00 am.',
      },
    });
  });

  await t.run(async (ctx) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversationId_and_createdAt', (q) => q.eq('conversationId', fixture.conversationId))
      .take(10);
    const logs = await ctx.db
      .query('conversationLogs')
      .withIndex('by_conversationId_and_performedAt', (q) => q.eq('conversationId', fixture.conversationId))
      .take(10);
    expect(messages).toMatchObject([{
      content: 'Hi Aina, your appointment is tomorrow at 10:00 am.',
      externalId: 'wamid.reminder',
      status: 'sent',
      workflowAutomationSource: 'workflowReminder',
    }]);
    expect(logs).toMatchObject([{
      action: 'reminder_sent',
      actorType: 'system',
      metadata: {
        message: 'Hi Aina, your appointment is tomorrow at 10:00 am.',
        runId: fixture.runId,
        templateName: 'appointment_reminder',
      },
    }]);
  });
});
