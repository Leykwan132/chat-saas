/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test, vi } from 'vitest';
import workpoolSchema from '../node_modules/@convex-dev/workpool/dist/component/schema.js';
import schema from './schema';
import {
  cancelWorkflowRemindersForAppointment,
  scheduleWorkflowRemindersForAppointment,
} from './workflowReminderRuntime';

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

test('schedules one idempotent reminder run and persists its Workpool ID', async () => {
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const t = convexTest(schema, modules);
  t.registerComponent('workflowReminderWorkpool', workpoolSchema, workpoolModules);
  const appointmentId = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      workosUserId: 'reminder-owner',
      email: 'owner@example.com',
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
    const agentId = await ctx.db.insert('agents', {
      name: 'Reminder Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Test',
      templateKey: 'blank',
      fileSize: 0,
      userId: 'reminder-owner',
      orgId: '',
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert('channels', {
      orgId: '',
      service: 'whatsapp',
      phoneNumberId: 'phone-number',
      accessToken: 'token',
      status: 'connected',
      connectedByUserId: 'reminder-owner',
      defaultAgentId: agentId,
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert('customers', {
      orgId: '',
      userId: 'reminder-owner',
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
    const conversationId = await ctx.db.insert('conversations', {
      orgId: '',
      userId: 'reminder-owner',
      channelId,
      service: 'whatsapp',
      orgAddress: 'business',
      contactAddress: '+60123456789',
      customerId,
      status: 'booked',
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: 'reminder-thread',
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('workflows', {
      agentId,
      orgId: '',
      userId: 'reminder-owner',
      name: 'Workflow',
      reminderAutomation: {
        enabled: true,
        activationScope: 'futureOnly',
        revision: 1,
        selections: {},
        timingOptionIds: ['oneHourBeforeAppointment'],
        customTimingOptions: [],
        template: {
          key: 'appointment_reminder\ten_US',
          name: 'appointment_reminder',
          language: 'en_US',
          category: 'UTILITY',
          components: [],
        },
      },
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.insert('calendarEvents', {
      teamId,
      title: 'Consultation',
      startAt: now + 3 * 60 * 60 * 1000,
      endAt: now + 4 * 60 * 60 * 1000,
      timeZone: 'Asia/Kuala_Lumpur',
      status: 'confirmed',
      createdBy: userId,
      agentId,
      conversationId,
      bookingSource: 'manual',
      createdAt: now,
      updatedAt: now,
    });
  });
  await t.run((ctx) => scheduleWorkflowRemindersForAppointment(ctx, appointmentId));
  expect(consoleLog).toHaveBeenCalledWith(
    'workflow_reminder_workpool_scheduled',
    expect.objectContaining({
      appointmentId,
      timingOptionId: 'oneHourBeforeAppointment',
      templateName: 'appointment_reminder',
    }),
  );
  await t.run((ctx) => scheduleWorkflowRemindersForAppointment(ctx, appointmentId));
  await t.run(async (ctx) => {
    const runs = await ctx.db.query('workflowAutomationRuns').collect();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toEqual(expect.objectContaining({
      appointmentId,
      status: 'scheduled',
      configurationRevision: 1,
    }));
    expect(runs[0].currentWorkId).toBeTruthy();
    expect(runs[0].workIds).toEqual([runs[0].currentWorkId]);
  });
  const originalWorkId = await t.run(async (ctx) => {
    const run = await ctx.db.query('workflowAutomationRuns').unique();
    if (!run?.currentWorkId) throw new Error('Scheduled reminder has no Workpool ID');
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) throw new Error('Appointment is missing');
    await ctx.db.patch(appointmentId, {
      startAt: appointment.startAt + 60 * 60 * 1000,
      endAt: appointment.endAt + 60 * 60 * 1000,
    });
    return run.currentWorkId;
  });
  await t.run((ctx) => cancelWorkflowRemindersForAppointment(
    ctx,
    appointmentId,
    'Appointment rescheduled',
  ));
  await t.run((ctx) => scheduleWorkflowRemindersForAppointment(ctx, appointmentId));
  await t.run(async (ctx) => {
    const run = await ctx.db.query('workflowAutomationRuns').unique();
    const appointment = await ctx.db.get(appointmentId);
    expect(run?.status).toBe('scheduled');
    expect(run?.appointmentStartAt).toBe(appointment?.startAt);
    expect(run?.currentWorkId).not.toBe(originalWorkId);
    expect(run?.workIds).toHaveLength(2);
  });
  await t.run((ctx) => cancelWorkflowRemindersForAppointment(
    ctx,
    appointmentId,
    'Appointment cancelled',
  ));
  await t.run(async (ctx) => {
    const runs = await ctx.db.query('workflowAutomationRuns').collect();
    expect(runs[0]).toEqual(expect.objectContaining({
      status: 'cancelled',
      reason: 'Appointment cancelled',
    }));
  });
  consoleLog.mockRestore();
});
