import { describe, expect, it } from "vitest";
import { textFromFileBytes } from "./fileBytesText";
import {
  shouldBackfillFile,
  shouldBackfillRow,
  shouldBackfillTextOrQa,
  shouldRerunParentWebsite,
} from "./backfillPlan";

describe("knowledge rag backfill plan", () => {
  it("re-embeds text, Q&A, and files even when a rag id already exists", () => {
    expect(shouldBackfillTextOrQa({ status: "completed" })).toBe(true);
    expect(shouldBackfillTextOrQa({})).toBe(true);
    expect(shouldBackfillFile({ status: "failed" })).toBe(true);
    expect(shouldBackfillTextOrQa({ status: "queued" })).toBe(false);
    expect(shouldBackfillFile({ status: "deleting" })).toBe(false);
  });

  it("re-runs only parent websites and skips in-flight rows", () => {
    expect(shouldRerunParentWebsite({ status: "completed" })).toBe(true);
    expect(shouldRerunParentWebsite({ parentId: "child", status: "completed" })).toBe(false);
    expect(shouldRerunParentWebsite({ status: "gettingLinks" })).toBe(false);
    expect(shouldBackfillRow("web", { parentId: "p1" })).toBe(false);
    expect(shouldBackfillRow("text", { status: "completed" })).toBe(true);
  });

  it("reads plain-text file bytes for RAG", async () => {
    const text = await textFromFileBytes(
      "notes.txt",
      new TextEncoder().encode("hello rag").buffer,
    );
    expect(text).toBe("hello rag");
  });
});
