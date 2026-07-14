/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import stripeSchema from '../node_modules/@convex-dev/stripe/dist/component/schema.js';

const modules = import.meta.glob('./**/*.ts');

function initTest() {
  const testClient = convexTest(schema, modules);
  testClient.registerComponent('stripe', stripeSchema, {
    public: () => import('../node_modules/@convex-dev/stripe/dist/component/public.js'),
    private: () => import('../node_modules/@convex-dev/stripe/dist/component/private.js'),
    '_generated/server': () => import('../node_modules/@convex-dev/stripe/dist/component/_generated/server.js'),
  });
  return testClient;
}

async function createAgent(testClient: ReturnType<typeof initTest>, workosUserId: string) {
  return await testClient.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      workosUserId,
      email: `${workosUserId}@example.com`,
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert('teams', {
      type: 'personal',
      name: 'Personal',
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('teamMemberships', { teamId, userId, role: 'owner', createdAt: now });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    return await ctx.db.insert('agents', {
      name: 'Draft Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Test',
      templateKey: 'blank',
      fileSize: 0,
      userId: workosUserId,
      orgId: '',
      createdAt: now,
      updatedAt: now,
    });
  });
}

test('atomically replaces a workflow draft, records saved template usage, and rejects stale saves', async () => {
  const testClient = initTest();
  const workosUserId = 'workflow-draft-save';
  const agentId = await createAgent(testClient, workosUserId);
  const authed = testClient.withIdentity({ subject: workosUserId });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  expect(initial.automations.reminder.enabled).toBe(false);
  expect(initial.automations.reminder.activationScope).toBe('futureOnly');
  expect(initial.automations.followUp.activationScope).toBe('futureOnly');
  const startNode = initial.nodes[0];
  const automations = {
    ...initial.automations,
    reminder: {
      ...initial.automations.reminder,
      enabled: true,
      activationScope: 'futureOnly' as const,
      template: {
        key: 'appointment_reminder\ten_US',
        name: 'appointment_reminder',
        language: 'en_US',
        category: 'UTILITY',
        components: [{
          type: 'BODY',
          text: 'Dear {{customer_name}}, your {{booking_service}} is on {{booking_date}} at {{booking_time}}.',
          example: {
            body_text_named_params: [
              { param_name: 'customer_name', example: 'Jessica Lee' },
              { param_name: 'booking_service', example: 'Consultation' },
              { param_name: 'booking_date', example: 'July 18 (Saturday)' },
              { param_name: 'booking_time', example: '2:00 PM - 3:00 PM' },
            ],
          },
        }],
      },
    },
  };
  const saveArgs = {
    agentId,
    baselineUpdatedAt: initial.workflow.updatedAt,
    layoutOrientation: 'horizontal' as const,
    nodes: [
      { clientId: startNode._id, persistedNodeId: startNode._id, kind: 'start' as const, title: 'Message enters', positionX: 0, positionY: 0 },
      { clientId: 'draft-node:file', kind: 'sendFile' as const, title: 'Send brochure', positionX: 300, positionY: 0 },
    ],
    edges: [{ sourceClientId: startNode._id, targetClientId: 'draft-node:file', label: 'Brochure' }],
    automations,
  };
  const saved = await authed.mutation(api.workflowDraftSave.save, {
    ...saveArgs,
    templateId: 'real-estate',
  });
  expect(saved.nodes.map((node) => node.kind).sort()).toEqual(['sendFile', 'start']);
  expect(saved.edges).toHaveLength(1);
  expect(saved.automations.reminder).toEqual(expect.objectContaining({
    enabled: true,
    activationScope: 'futureOnly',
    revision: 1,
  }));
  expect(saved.automations.reminder.template?.components?.[0]).toEqual(
    expect.objectContaining({
      example: {
        body_text_named_params: [
          { param_name: 'customer_name', example: 'Jessica Lee' },
          { param_name: 'booking_service', example: 'Consultation' },
          { param_name: 'booking_date', example: 'July 18 (Saturday)' },
          { param_name: 'booking_time', example: '2:00 PM - 3:00 PM' },
        ],
      },
    }),
  );
  await testClient.run(async (ctx) => {
    const usage = await ctx.db.query('workflowTemplateUsage').take(10);
    const totals = await ctx.db.query('workflowTemplateUsageTotals').take(10);
    expect(usage).toEqual([
      expect.objectContaining({ agentId, templateId: 'real-estate', saveCount: 1 }),
    ]);
    expect(totals).toEqual([
      expect.objectContaining({ templateId: 'real-estate', uniqueAgentCount: 1, saveCount: 1 }),
    ]);
  });
  const savedAgain = await authed.mutation(api.workflowDraftSave.save, {
    agentId,
    baselineUpdatedAt: saved.workflow.updatedAt,
    layoutOrientation: 'horizontal',
    templateId: 'real-estate',
    nodes: saved.nodes.map((node) => ({
      clientId: node._id,
      persistedNodeId: node._id,
      kind: node.kind,
      title: node.title,
      description: node.description,
      positionX: node.positionX,
      positionY: node.positionY,
    })),
    edges: saved.edges.map((edge) => ({
      sourceClientId: edge.sourceNodeId,
      targetClientId: edge.targetNodeId,
      label: edge.label,
      detail: edge.detail,
    })),
    automations: saved.automations,
  });
  expect(savedAgain.workflow.updatedAt).toBeGreaterThan(saved.workflow.updatedAt);
  await testClient.run(async (ctx) => {
    const usage = await ctx.db.query('workflowTemplateUsage').take(10);
    const totals = await ctx.db.query('workflowTemplateUsageTotals').take(10);
    expect(usage[0].saveCount).toBe(2);
    expect(totals[0].uniqueAgentCount).toBe(1);
    expect(totals[0].saveCount).toBe(2);
  });
  await expect(authed.mutation(api.workflowDraftSave.save, {
    ...saveArgs,
    templateId: 'real-estate',
  })).rejects.toThrow('changed elsewhere');
  await testClient.run(async (ctx) => {
    const usage = await ctx.db.query('workflowTemplateUsage').take(10);
    const totals = await ctx.db.query('workflowTemplateUsageTotals').take(10);
    expect(usage[0].saveCount).toBe(2);
    expect(totals[0].saveCount).toBe(2);
  });
});
