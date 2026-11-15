import { expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { sendEscalationMessageThenEscalate } from "./threads";

const conversationId = "conversation" as Id<"conversations">;
const args = { conversationId, question: "I need a person", context: "Needs support", sourceAgentMessageId: "customer-message", message: "Old message" };

type Mode = "manual" | "ai";
function fixture(mode: Mode = "manual", options: { unavailable?: boolean; generationFailure?: boolean; deliveryFailure?: boolean; changeMode?: boolean } = {}) {
  const events: string[] = [];
  let policy: { nodeId: string; mode: Mode; message: string } | null = options.unavailable ? null : { nodeId: "node", mode, message: "Saved handoff message" };
  const runAction = vi.fn(async (reference, input) => {
    const name = getFunctionName(reference);
    if (name === "chat/escalationMessageGeneration:generate") {
      events.push("generate");
      if (options.generationFailure) throw new Error("Generation failed");
      if (options.changeMode) policy = { nodeId: "node", mode: "manual", message: "Changed" };
      return { content: "Generated handoff", llmModel: "test-model", billingUserId: "owner", agentId: "agent" };
    }
    expect(name).toBe("chat/inboxActions:internalSendEscalationMessage");
    expect(input).not.toHaveProperty("balanceAfter");
    expect(input.content).toBe(mode === "ai" ? "Generated handoff" : "Saved handoff message");
    events.push("send-message");
    return { ok: !options.deliveryFailure, error: "Channel unavailable" };
  });
  const runMutation = vi.fn(async (reference) => {
    if (getFunctionName(reference) === "credits:internalDeductCredits") {
      events.push("charge");
      return { llmModel: "test-model", creditsCharged: 1, balanceAfter: 99 };
    }
    events.push("escalate");
    return true;
  });
  const ctx = { runQuery: vi.fn(async () => policy), runAction, runMutation } as unknown as Pick<ActionCtx, "runQuery" | "runAction" | "runMutation">;
  return { ctx, events, runAction, runMutation };
}

test("delivers the current manual message before pausing AI with no generation or AI charge", async () => {
  const f = fixture();
  expect(await sendEscalationMessageThenEscalate(f.ctx, args)).toBe(true);
  expect(f.events).toEqual(["send-message", "escalate"]);
});

test("AI-written handoff generates, charges, sends, then escalates", async () => {
  const f = fixture("ai");
  expect(await sendEscalationMessageThenEscalate(f.ctx, args)).toBe(true);
  expect(f.events).toEqual(["generate", "charge", "send-message", "escalate"]);
  expect(f.runAction.mock.calls.at(-1)?.[1]).toEqual({ conversationId, content: "Generated handoff", llmModel: "test-model", creditsCharged: 1 });
});

test("custom message off uses an AI-written handoff", async () => {
  const f = fixture("ai");
  expect(await sendEscalationMessageThenEscalate(f.ctx, args)).toBe(true);
  expect(f.events).toEqual(["generate", "charge", "send-message", "escalate"]);
});

test("generation failure never sends or pauses AI", async () => {
  const f = fixture("ai", { generationFailure: true });
  await expect(sendEscalationMessageThenEscalate(f.ctx, args)).rejects.toThrow("Generation failed");
  expect(f.events).toEqual(["generate"]);
});

test("delivery failure never pauses AI", async () => {
  const f = fixture("manual", { deliveryFailure: true });
  await expect(sendEscalationMessageThenEscalate(f.ctx, args)).rejects.toThrow("Channel unavailable");
  expect(f.events).toEqual(["send-message"]);
});

test("closed, already escalated or disabled handoffs do nothing", async () => {
  const f = fixture("ai", { unavailable: true });
  expect(await sendEscalationMessageThenEscalate(f.ctx, args)).toBe(false);
  expect(f.events).toEqual([]);
});

test("changing the chosen mode while generating prevents sending the outdated message", async () => {
  const f = fixture("ai", { changeMode: true });
  expect(await sendEscalationMessageThenEscalate(f.ctx, args)).toBe(false);
  expect(f.events).toEqual(["generate"]);
});
