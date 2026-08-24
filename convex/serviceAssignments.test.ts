/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { appendTeammateToAgentServices } from './appointmentBooking/serviceAssignments';

const modules = import.meta.glob('./**/*.ts');

test('does not assign a new teammate to a creator-only service', async () => {
  const testInstance = convexTest(schema, modules);
  const { agentId, serviceId } = await testInstance.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert('agents', {
      name: 'Booking Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Book appointments',
      templateKey: 'sales',
      fileSize: 0,
      userId: 'creator',
      orgId: 'team',
      createdAt: now,
      updatedAt: now,
    });
    const serviceId = await ctx.db.insert('appointmentServices', {
      agentId,
      name: 'Consultation',
      isActive: true,
      sortOrder: 0,
      durationMinutes: 30,
      fields: [],
      timeSlotPolicy: 'offer_slots',
      salesStyle: 'neutral',
      assignmentStrategy: 'balanced',
      assignedWorkosUserIds: ['creator'],
      autoAssignNewMembers: false,
      createdAt: now,
      updatedAt: now,
    });
    return { agentId, serviceId };
  });

  await testInstance.run(async (ctx) => {
    await appendTeammateToAgentServices(ctx, agentId, 'invited-member');
  });

  const service = await testInstance.run(async (ctx) => await ctx.db.get(serviceId));

  expect(service?.assignedWorkosUserIds).toEqual(['creator']);
});
