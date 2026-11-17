import { z } from "zod";

export const snapshotInput = z.strictObject({
  agentId: z.string().min(1).max(200),
});
const count = z.number().int().nonnegative();
export const snapshotSchema = z.strictObject({
  agentId: z.string().min(1).max(200),
  name: z.string().max(200),
  capturedAt: z.number(),
  scope: z.literal("connected_inbox_channels"),
  totalChats: count,
  unreadChats: count,
  unreadMessages: count,
  escalatedChats: count,
  unassignedChats: count,
  chatsWithBookings: count,
  byPlatform: z.strictObject({
    whatsapp: count,
    instagram: count,
    messenger: count,
    web: count,
    avatar: count,
  }),
  byStatus: z.strictObject({
    open: count,
    snoozed: count,
    closed: count,
    booked: count,
    requires_user_input: count,
  }),
  lastActivityAt: z.number().nullable(),
});
