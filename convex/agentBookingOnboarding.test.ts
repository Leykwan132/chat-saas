/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import stripeSchema from '../node_modules/@convex-dev/stripe/dist/component/schema.js';

const modules = import.meta.glob('./**/*.ts');

function initTest() {
  const testInstance = convexTest(schema, modules);
  testInstance.registerComponent('stripe', stripeSchema, {
    public: () => import('../node_modules/@convex-dev/stripe/dist/component/public.js'),
    private: () => import('../node_modules/@convex-dev/stripe/dist/component/private.js'),
    '_generated/server': () =>
      import('../node_modules/@convex-dev/stripe/dist/component/_generated/server.js'),
  });
  return testInstance;
}

test('creates a creator-only service and ready booking action with booking onboarding', async () => {
  const testInstance = initTest();
  const workosUserId = 'booking-onboarding-owner';
  const agentId = await testInstance.withIdentity({ subject: workosUserId }).mutation(
    api.agents.create,
    {
      name: 'Booking Assistant',
      businessName: 'Glow Studio',
      businessDescription: 'Beauty appointments',
      goal: 'bookService',
      bookingOnboarding: {
        availability: {
          timezone: 'Asia/Kuala_Lumpur',
          shifts: [
            { dayOfWeek: 1, startMinutes: 540, endMinutes: 1020 },
            { dayOfWeek: 2, startMinutes: 540, endMinutes: 1020 },
          ],
        },
        service: {
          name: 'Consultation',
          durationMinutes: 45,
          appointmentBookingEnabled: true,
        },
      },
    },
  );

  const onboarding = await testInstance.run(async (ctx) => {
    const schedule = await ctx.db
      .query('userSchedules')
      .withIndex('by_agentId_and_workosUserId', (q) =>
        q.eq('agentId', agentId).eq('workosUserId', workosUserId),
      )
      .unique();
    const services = await ctx.db
      .query('appointmentServices')
      .withIndex('by_agentId_and_sortOrder', (q) => q.eq('agentId', agentId))
      .collect();
    const workflow = await ctx.db
      .query('workflows')
      .withIndex('by_agentId', (q) => q.eq('agentId', agentId))
      .unique();
    const nodes = workflow === null
      ? []
      : await ctx.db
        .query('workflowNodes')
        .withIndex('by_workflowId', (q) => q.eq('workflowId', workflow._id))
        .collect();
    return {
      shifts: schedule === null
        ? []
        : await ctx.db
          .query('userShifts')
          .withIndex('by_userScheduleId', (q) => q.eq('userScheduleId', schedule._id))
          .collect(),
      service: services[0],
      bookingNode: nodes.find((node) => node.kind === 'bookAppointment'),
    };
  });

  expect(onboarding.shifts.map(({ dayOfWeek, startMinutes, endMinutes }) => ({
    dayOfWeek,
    startMinutes,
    endMinutes,
  }))).toEqual([
    { dayOfWeek: 1, startMinutes: 540, endMinutes: 1020 },
    { dayOfWeek: 2, startMinutes: 540, endMinutes: 1020 },
  ]);
  expect(onboarding.service).toMatchObject({
    name: 'Consultation',
    durationMinutes: 45,
    isActive: true,
    assignedWorkosUserIds: [workosUserId],
    autoAssignNewMembers: false,
  });
  expect(onboarding.bookingNode).toMatchObject({
    isReady: true,
    allowedAppointmentServiceIds: [onboarding.service?._id],
  });
});

test('creates availability without a service when booking setup is skipped', async () => {
  const testInstance = initTest();
  const workosUserId = 'booking-onboarding-skip-owner';
  const agentId = await testInstance.withIdentity({ subject: workosUserId }).mutation(
    api.agents.create,
    {
      name: 'Booking Assistant',
      businessName: 'Glow Studio',
      businessDescription: 'Beauty appointments',
      goal: 'bookService',
      bookingOnboarding: {
        availability: {
          timezone: 'Asia/Kuala_Lumpur',
          shifts: [{ dayOfWeek: 3, startMinutes: 600, endMinutes: 960 }],
        },
      },
    },
  );

  const onboarding = await testInstance.run(async (ctx) => {
    const [schedule, services, workflow] = await Promise.all([
      ctx.db
        .query('userSchedules')
        .withIndex('by_agentId_and_workosUserId', (q) =>
          q.eq('agentId', agentId).eq('workosUserId', workosUserId),
        )
        .unique(),
      ctx.db
        .query('appointmentServices')
        .withIndex('by_agentId_and_sortOrder', (q) => q.eq('agentId', agentId))
        .collect(),
      ctx.db.query('workflows').withIndex('by_agentId', (q) => q.eq('agentId', agentId)).unique(),
    ]);
    const nodes = workflow === null
      ? []
      : await ctx.db
        .query('workflowNodes')
        .withIndex('by_workflowId', (q) => q.eq('workflowId', workflow._id))
        .collect();
    const shifts = schedule === null
      ? []
      : await ctx.db
        .query('userShifts')
        .withIndex('by_userScheduleId', (q) => q.eq('userScheduleId', schedule._id))
        .collect();
    return { services, nodes, shifts };
  });

  expect(onboarding.shifts.map(({ dayOfWeek, startMinutes, endMinutes }) => ({
    dayOfWeek,
    startMinutes,
    endMinutes,
  }))).toEqual([{ dayOfWeek: 3, startMinutes: 600, endMinutes: 960 }]);
  expect(onboarding.services).toEqual([]);
  expect(onboarding.nodes.some((node) => node.kind === 'bookAppointment')).toBe(false);
});

test('rejects booking onboarding for a support agent', async () => {
  const testInstance = initTest();

  await expect(testInstance.withIdentity({ subject: 'support-onboarding-owner' }).mutation(
    api.agents.create,
    {
      name: 'Support Assistant',
      businessName: 'Glow Studio',
      businessDescription: 'Beauty appointments',
      goal: 'support',
      bookingOnboarding: {
        availability: {
          timezone: 'Asia/Kuala_Lumpur',
          shifts: [],
        },
      },
    },
  )).rejects.toThrow('Booking onboarding requires the Book a Service goal');
});
