import { beforeEach, expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { generateText } from "ai";
import { generate } from "./escalationMessageGeneration";

vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("../llm/languageModel", () => ({ resolveLanguageModel: () => ({ languageModel: "test-model", provider: "openrouter" }) }));
vi.mock("../posthog", () => ({ captureAIGeneration: vi.fn() }));

beforeEach(() => {
  vi.mocked(generateText).mockResolvedValue({ text: "我会请同事协助您。", usage: { inputTokens: 80, outputTokens: 12, totalTokens: 92 } } as never);
});

function fixture(credits = true, active = true) {
  const runMutation = vi.fn(async () => ({ workosUserId: "owner" }));
  const ctx = {
    runQuery: vi.fn(async (reference) => {
      const name = getFunctionName(reference);
      if (name === "escalationMessages:getGenerationInput") return { agentId: "agent", agentName: "Support", model: "test", billingUserId: "owner", orgId: "org", threadId: "thread", instructions: "Be warm", customerMessage: "我想找真人", conversation: [] };
      if (name === "credits:internalCheckCredits") return { ok: credits, reason: "insufficient_credits" };
      if (name === "teamDeletion/access:canProcess") return active;
      throw new Error(`Unexpected query ${name}`);
    }),
    runMutation,
  } as unknown as ActionCtx;
  const args = { conversationId: "conversation" as Id<"conversations">, workflowNodeId: "node" as Id<"workflowNodes">, sourceAgentMessageId: "source" };
  return { ctx, args, runMutation };
}

test("AI handoff uses context and the assigned model, tracking usage before returning text", async () => {
  const f = fixture();
  expect(await generate._handler(f.ctx, f.args)).toMatchObject({ content: "我会请同事协助您。", llmModel: "test", billingUserId: "owner", agentId: "agent" });
  expect(generateText).toHaveBeenCalledWith(expect.objectContaining({ system: expect.stringContaining("same language"), prompt: expect.stringContaining("我想找真人") }));
  expect(f.runMutation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ usage: { promptTokens: 80, completionTokens: 12, totalTokens: 92 } }));
});

test("empty generation fails explicitly without returning a default message", async () => {
  vi.mocked(generateText).mockResolvedValue({ text: " ", usage: { inputTokens: 80, outputTokens: 0, totalTokens: 80 } } as never);
  const f = fixture();
  await expect(generate._handler(f.ctx, f.args)).rejects.toThrow("empty");
});

test("reasoning models can finish the handoff before exhausting the output budget", async () => {
  vi.mocked(generateText).mockImplementation(async (options) => ({
    text: (options.maxOutputTokens ?? 0) > 1024 ? "我会请同事协助您。" : "",
    usage: { inputTokens: 80, outputTokens: 1050, totalTokens: 1130 },
  }) as never);
  const f = fixture();
  expect(await generate._handler(f.ctx, f.args)).toMatchObject({ content: "我会请同事协助您。" });
});

test.each([[false, true], [true, false]])("credits and workspace status gate AI generation", async (credits, active) => {
  const f = fixture(credits, active);
  vi.mocked(generateText).mockClear();
  await expect(generate._handler(f.ctx, f.args)).rejects.toThrow();
  expect(generateText).not.toHaveBeenCalled();
});
