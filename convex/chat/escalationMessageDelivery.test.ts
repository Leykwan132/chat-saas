import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { sendEscalationMessageThenEscalate } from "./threads";

const conversationId = "conversation" as Id<"conversations">;

test("delivers the configured escalation message before pausing AI replies", async () => {
  const events: string[] = [];
  const ctx = {
    runQuery: async () => null,
    runAction: async () => {
      events.push("send-message");
      return { ok: true };
    },
    runMutation: async () => {
      events.push("escalate");
      return null;
    },
  } as unknown as Pick<ActionCtx, "runAction" | "runMutation" | "runQuery">;

  await sendEscalationMessageThenEscalate(ctx, {
    conversationId,
    question: "I need help from a person.",
    context: "The customer asked for a human teammate.",
    sourceAgentMessageId: "customer-message",
    message: "A teammate will be with you shortly.",
  });

  expect(events).toEqual(["send-message", "escalate"]);
});

test("does not pause AI replies when the escalation message cannot be sent", async () => {
  const events: string[] = [];
  const ctx = {
    runQuery: async () => null,
    runAction: async () => {
      events.push("send-message");
      return { ok: false, error: "Channel unavailable" };
    },
    runMutation: async () => {
      events.push("escalate");
      return null;
    },
  } as unknown as Pick<ActionCtx, "runAction" | "runMutation" | "runQuery">;

  await expect(
    sendEscalationMessageThenEscalate(ctx, {
      conversationId,
      question: "I need help from a person.",
      context: "The customer asked for a human teammate.",
      sourceAgentMessageId: "customer-message",
      message: "A teammate will be with you shortly.",
    }),
  ).rejects.toThrow("Channel unavailable");

  expect(events).toEqual(["send-message"]);
});

test("does not send or escalate when the conversation already has an escalation", async () => {
  const events: string[] = [];
  const ctx = {
    runQuery: async () => ({ escalation: { question: "Already escalated" } }),
    runAction: async () => {
      events.push("send-message");
      return { ok: true };
    },
    runMutation: async () => {
      events.push("escalate");
      return null;
    },
  } as unknown as Pick<ActionCtx, "runAction" | "runMutation" | "runQuery">;

  const created = await sendEscalationMessageThenEscalate(ctx, {
    conversationId,
    question: "I need help from a person.",
    context: "The customer asked for a human teammate.",
    sourceAgentMessageId: "customer-message",
    message: "A teammate will be with you shortly.",
  });

  expect(created).toBe(false);
  expect(events).toEqual([]);
});
