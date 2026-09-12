import { describe, expect, it } from "vitest";
import { knowledgeEntryPayload } from "./ingest";
import { ragKey, ragNamespace } from "./client";

describe("knowledgeEntryPayload", () => {
  it("keeps the question searchable alongside the answer", () => {
    const payload = knowledgeEntryPayload({
      entryType: "qa",
      question: "  Do you ship to Sabah?  ",
      answer: "Yes, within 3 working days.",
    });
    expect(payload.title).toBe("Do you ship to Sabah?");
    expect(payload.text).toContain("Do you ship to Sabah?");
    expect(payload.text).toContain("Yes, within 3 working days.");
  });

  it("indexes extracted file text rather than the file name", () => {
    const payload = knowledgeEntryPayload({
      entryType: "file",
      fileName: "refund-policy.pdf",
      extractedText: "  Refunds are processed within 14 days.  ",
    });
    expect(payload.title).toBe("refund-policy.pdf");
    expect(payload.text).toBe("Refunds are processed within 14 days.");
  });

  it("indexes scraped web markdown", () => {
    const payload = knowledgeEntryPayload({
      entryType: "web",
      title: "https://example.com/pricing",
      content: "# Pricing\n\nStarter plan is RM99.",
    });
    expect(payload.text).toContain("Starter plan is RM99.");
  });
});

describe("rag namespacing", () => {
  it("isolates each agent and makes re-uploads replace the same key", () => {
    expect(ragNamespace("agent_a")).not.toBe(ragNamespace("agent_b"));
    expect(ragKey("file", "entry_1")).toBe(ragKey("file", "entry_1"));
    expect(ragKey("file", "entry_1")).not.toBe(ragKey("qa", "entry_1"));
  });
});
