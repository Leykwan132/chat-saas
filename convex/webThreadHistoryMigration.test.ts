import { describe, expect, it } from "vitest";
import {
  getWebThreadBackfillDecision,
  MAX_WEB_THREAD_BACKFILL_MESSAGES,
} from "./webThreadHistoryMigration";

describe("getWebThreadBackfillDecision", () => {
  it("backfills an empty web thread with legacy messages", () => {
    expect(
      getWebThreadBackfillDecision({
        service: "web",
        ledgerMessages: [{ agentMessageId: undefined }],
        threadMessageIds: [],
      }),
    ).toEqual("backfill");
  });

  it("marks a web thread complete when every ledger message is already in it", () => {
    expect(
      getWebThreadBackfillDecision({
        service: "web",
        ledgerMessages: [{ agentMessageId: "agent-1" }, { agentMessageId: "agent-2" }],
        threadMessageIds: ["agent-1", "agent-2"],
      }),
    ).toEqual("complete");
  });

  it("stops on partial thread data instead of duplicating messages", () => {
    expect(() =>
      getWebThreadBackfillDecision({
        service: "web",
        ledgerMessages: [{ agentMessageId: undefined }],
        threadMessageIds: ["agent-1"],
      }),
    ).toThrow("partial Agent thread");
  });

  it("does not process non-web conversations", () => {
    expect(
      getWebThreadBackfillDecision({
        service: "whatsapp",
        ledgerMessages: [{ agentMessageId: undefined }],
        threadMessageIds: [],
      }),
    ).toEqual("skip");
  });

  it("stops before a bounded migration could omit history", () => {
    expect(() =>
      getWebThreadBackfillDecision({
        service: "web",
        ledgerMessages: Array.from(
          { length: MAX_WEB_THREAD_BACKFILL_MESSAGES + 1 },
          () => ({ agentMessageId: undefined }),
        ),
        threadMessageIds: [],
      }),
    ).toThrow("exceeds the safe limit");
  });

  it("accepts a 201-message legacy web history", () => {
    expect(
      getWebThreadBackfillDecision({
        service: "web",
        ledgerMessages: Array.from(
          { length: 201 },
          () => ({ agentMessageId: undefined }),
        ),
        threadMessageIds: [],
      }),
    ).toEqual("backfill");
  });
});
