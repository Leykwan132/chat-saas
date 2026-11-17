import { afterEach, expect, test, vi } from "vitest";
import { jsonSchema } from "ai";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  assertCurrentReplyRun,
  protectGroupedReplyTools,
} from "./inboundReplyToolGuards";
import {
  handleReplyGenerationError,
  ReplySupersededError,
} from "./replyCancellation";

afterEach(() => vi.restoreAllMocks());

const runId = "run" as Id<"inboundReplyRuns">;
const details = { conversationId: "conversation", runId };

test("a stale generation is handled as cancellation instead of an uncaught failure", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const ctx = { runQuery: vi.fn().mockResolvedValue(false) } as unknown as Pick<
    ActionCtx,
    "runQuery"
  >;
  let caught: unknown;
  try {
    await assertCurrentReplyRun(ctx, runId);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ReplySupersededError);
  expect(() => handleReplyGenerationError(caught, details)).not.toThrow();
  expect(log).toHaveBeenCalledWith(
    "[inbox] reply generation cancelled",
    details,
  );
});

test("real failures still escape even when their text resembles cancellation", () => {
  const error = new Error("Reply generation was superseded");
  expect(() => handleReplyGenerationError(error, details)).toThrow(error);
});

test("a current generation continues without cancellation", async () => {
  const ctx = { runQuery: vi.fn().mockResolvedValue(true) } as unknown as Pick<
    ActionCtx,
    "runQuery"
  >;
  await expect(assertCurrentReplyRun(ctx, runId)).resolves.toBeUndefined();
});

test("a cancellation between checking a run and claiming its tool never executes the tool", async () => {
  const execute = vi.fn();
  const ctx = {
    runQuery: vi.fn().mockResolvedValue(true),
    runMutation: vi.fn().mockResolvedValue({ cancelled: true }),
  } as unknown as Pick<ActionCtx, "runQuery" | "runMutation">;
  const tools = protectGroupedReplyTools(ctx, runId, {
    bookAppointment: { inputSchema: jsonSchema({ type: "object" }), execute },
  });
  await expect(
    tools.bookAppointment.execute!({}, { toolCallId: "test", messages: [] }),
  ).rejects.toBeInstanceOf(ReplySupersededError);
  expect(execute).not.toHaveBeenCalled();
});
