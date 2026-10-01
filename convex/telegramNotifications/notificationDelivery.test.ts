import { convexTest } from 'convex-test';
import { afterEach, expect, test, vi } from 'vitest';
import schema from '../schema';
import { internal } from '../_generated/api';
import { telegramNotificationWorkpool } from './pool';
import { notifyAppointmentEvent, notifyHumanEscalation } from './events';
import { eventTestNotification } from './testPreview';

const modules = import.meta.glob('/convex/**/*.ts');

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function notificationFixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      workosUserId: 'notification-owner', email: 'owner@example.com', createdAt: now, updatedAt: now,
    });
    const teamId = await ctx.db.insert('teams', {
      type: 'personal', name: 'Notifications', ownerId: userId, createdAt: now, updatedAt: now,
    });
    const agentId = await ctx.db.insert('agents', {
      name: 'Support Agent', provider: 'ilmu', model: 'ilmu-mini-v3.3', systemPrompt: 'Help',
      templateKey: 'support', fileSize: 0, userId: 'notification-owner', orgId: '', createdAt: now, updatedAt: now,
    });
    const conversationId = await ctx.db.insert('conversations', {
      orgId: '', service: 'web', orgAddress: 'website', contactAddress: 'alicia@example.com',
      contactName: 'Alicia Tan', status: 'open', assignedAgentId: agentId, assignToAiAgent: false,
      threadId: 'thread-1', lastMessageAt: now, unreadCount: 0, createdAt: now, updatedAt: now,
    });
    const recipientId = await ctx.db.insert('telegramNotificationRecipients', {
      phoneDigits: '60123456789', status: 'verified', telegramChatId: 'chat-telegram', createdAt: now, updatedAt: now,
    });
    const subscriptionId = await ctx.db.insert('agentTelegramNotificationSubscriptions', {
      agentId, recipientId, status: 'enabled', createdAt: now, updatedAt: now,
    });
    const appointmentId = await ctx.db.insert('calendarEvents', {
      teamId, agentId, conversationId, title: 'Consultation', startAt: Date.parse('2026-10-02T08:00:00Z'),
      endAt: Date.parse('2026-10-02T08:30:00Z'), timeZone: 'Asia/Kuala_Lumpur', status: 'confirmed',
      createdBy: userId, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert('calendarEventParticipants', {
      eventId: appointmentId, teamId, role: 'customer', participantType: 'customer', email: 'alicia@example.com', displayName: 'Alicia Tan',
      eventStartAt: Date.parse('2026-10-02T08:00:00Z'), eventEndAt: Date.parse('2026-10-02T08:30:00Z'),
      createdAt: now, updatedAt: now,
    });
    return { agentId, conversationId, subscriptionId, appointmentId };
  });
  return { t, ...ids };
}

test('live notifications queue direct chat buttons and calendar only when booked', async () => {
  vi.stubEnv('APP_BASE_URL', 'https://chat.example.com');
  const queued: Array<{ text: string; buttons?: Array<{ text: string; url: string }> }> = [];
  vi.spyOn(telegramNotificationWorkpool, 'enqueueAction').mockImplementation(async (_ctx, _fn, args) => {
    queued.push(args as typeof queued[number]);
    return 'work-id' as never;
  });
  const { t, agentId, conversationId, appointmentId } = await notificationFixture();
  await t.run(async (ctx) => {
    await notifyHumanEscalation(ctx, agentId, conversationId, 'Support Agent');
    for (const event of ['booked', 'updated', 'cancelled'] as const) {
      await notifyAppointmentEvent(ctx, agentId, appointmentId, 'Support Agent', event);
    }
  });
  expect(queued).toHaveLength(4);
  const chatUrl = `https://chat.example.com/dashboard/${agentId}/inbox?conversation=${conversationId}`;
  for (const message of queued) {
    expect(message.buttons?.[0]).toEqual({ text: 'Open chat', url: chatUrl });
    expect(message.text).toContain(`Open chat: ${chatUrl}`);
  }
  expect(queued.map((message) => message.buttons?.length)).toEqual([1, 2, 1, 1]);
  const calendar = new URL(queued[1].buttons![1].url);
  expect(calendar.searchParams.get('dates')).toBe('20261002T080000Z/20261002T083000Z');
  expect(calendar.searchParams.get('text')).toBe('Consultation — Alicia Tan');
});

test('delivers demo buttons to Telegram alongside the test message', async () => {
  vi.stubEnv('NOTIFICATION_BOT_TOKEN', 'test-token');
  vi.stubEnv('NOTIFICATION_BOT_USERNAME', 'test_bot');
  const requests: Array<Record<string, unknown>> = [];
  vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }));
  }));
  const { t, subscriptionId, agentId } = await notificationFixture();
  const notification = eventTestNotification('bookingCreated', 'Support Agent', 'https://chat.example.com', agentId);
  await t.action(internal.telegramNotifications.worker.sendNotification, { subscriptionId, ...notification });
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    chat_id: 'chat-telegram', text: notification.text,
    reply_markup: { inline_keyboard: [notification.buttons] },
  });
});

test('finds the customer chat when the booking has no conversation reference', async () => {
  vi.stubEnv('APP_BASE_URL', 'https://chat.example.com');
  const queued: Array<{ buttons?: Array<{ text: string; url: string }> }> = [];
  vi.spyOn(telegramNotificationWorkpool, 'enqueueAction').mockImplementation(async (_ctx, _fn, args) => {
    queued.push(args as typeof queued[number]);
    return 'work-id' as never;
  });
  const { t, agentId, conversationId, appointmentId } = await notificationFixture();
  await t.run(async (ctx) => {
    const now = Date.now();
    const customerId = await ctx.db.insert('customers', {
      orgId: '', name: 'Alicia Tan', service: 'web', source: 'web',
      contactAddress: 'alicia@example.com', tags: [], firstSeenAt: now, lastSeenAt: now, createdAt: now, updatedAt: now,
    });
    await ctx.db.patch(conversationId, { customerId });
    await ctx.db.patch(appointmentId, { conversationId: undefined });
    const participant = await ctx.db.query('calendarEventParticipants')
      .withIndex('by_eventId', (q) => q.eq('eventId', appointmentId)).first();
    await ctx.db.patch(participant!._id, { customerId });
    await notifyAppointmentEvent(ctx, agentId, appointmentId, 'Support Agent', 'updated');
  });
  expect(queued[0].buttons?.[0].url).toBe(
    `https://chat.example.com/dashboard/${agentId}/inbox?conversation=${conversationId}`,
  );
});

test.each([
  { address: '+60 12-345 6789', username: undefined, expected: 'https://wa.me/60123456789' },
  { address: 'US.13491208655302741918', username: 'alicia.tan', expected: 'https://wa.me/alicia.tan' },
])('WhatsApp escalation and every booking event open $expected', async ({ address, username, expected }) => {
  vi.stubEnv('APP_BASE_URL', 'https://chat.example.com');
  const queued: Array<{ text: string; buttons?: Array<{ text: string; url: string }> }> = [];
  vi.spyOn(telegramNotificationWorkpool, 'enqueueAction').mockImplementation(async (_ctx, _fn, args) => {
    queued.push(args as typeof queued[number]);
    return 'work-id' as never;
  });
  const { t, agentId, conversationId, appointmentId } = await notificationFixture();
  await t.run(async (ctx) => {
    const now = Date.now();
    const customerId = await ctx.db.insert('customers', {
      orgId: '', service: 'whatsapp', source: 'whatsapp', contactAddress: address, whatsappUsername: username,
      tags: [], firstSeenAt: now, lastSeenAt: now, createdAt: now, updatedAt: now,
    });
    await ctx.db.patch(conversationId, { service: 'whatsapp', contactAddress: address, customerId });
    await notifyHumanEscalation(ctx, agentId, conversationId, 'Support Agent');
    for (const event of ['booked', 'updated', 'cancelled'] as const) {
      await notifyAppointmentEvent(ctx, agentId, appointmentId, 'Support Agent', event);
    }
  });
  expect(queued).toHaveLength(4);
  for (const message of queued) {
    expect(message.buttons?.[0]).toEqual({ text: 'Chat on WhatsApp', url: expected });
    expect(message.text).toContain(`Chat on WhatsApp: ${expected}`);
    expect(message.text).not.toContain('/dashboard/');
  }
  const calendar = new URL(queued[1].buttons![1].url);
  expect(calendar.searchParams.get('details')).toBe(`Chat on WhatsApp: ${expected}`);
});
