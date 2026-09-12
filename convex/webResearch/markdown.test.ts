import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  isWebEntryBusy,
  requireResearchMarkdown,
  WEBSITE_RESEARCH_PAID_PLAN_ERROR,
} from "./markdown";
import { generateWebMarkdownKey } from "./markdownKey";
import { PLAN_CATALOG } from "../../shared/planCatalog";
import { WEBSITE_RESEARCH_INSTRUCTIONS } from "./prompt";

describe("website research markdown", () => {
  it("rejects empty Perplexity output", () => {
    expect(() => requireResearchMarkdown("")).toThrow("Perplexity returned no output");
    expect(() => requireResearchMarkdown("  ")).toThrow("Perplexity returned no output");
    expect(requireResearchMarkdown("  # Acme  ")).toBe("# Acme");
  });

  it("asks for independent markdown facts instead of JSON", () => {
    expect(WEBSITE_RESEARCH_INSTRUCTIONS).toContain("Return Markdown only");
    expect(WEBSITE_RESEARCH_INSTRUCTIONS).not.toContain("json_schema");
    expect(WEBSITE_RESEARCH_INSTRUCTIONS).toContain("The Acme Clinic general check-up costs RM120.");
  });

  it("keeps website research on paid plans only", () => {
    expect(PLAN_CATALOG.free.features.website_research).toBe(false);
    expect(PLAN_CATALOG.starter.features.website_research).toBe(true);
    expect(PLAN_CATALOG.growth.features.website_research).toBe(true);
    expect(WEBSITE_RESEARCH_PAID_PLAN_ERROR).toContain("paid plans");
    const enqueueSource = readFileSync(
      fileURLToPath(new URL("./enqueue.ts", import.meta.url)),
      "utf8",
    );
    expect(enqueueSource).toContain("internalCanResearchWebsites");
    expect(enqueueSource).not.toContain("refreshWebResearch");
    const updateSource = readFileSync(
      fileURLToPath(new URL("./update.ts", import.meta.url)),
      "utf8",
    );
    expect(updateSource).toContain("webScraperPool.enqueueAction");
    expect(updateSource).toContain("persistUpdatedWebMarkdown");
  });

  it("treats in-flight website statuses as busy", () => {
    expect(isWebEntryBusy("gettingLinks")).toBe(true);
    expect(isWebEntryBusy("gettingMarkdown")).toBe(true);
    expect(isWebEntryBusy("completed")).toBe(false);
    expect(isWebEntryBusy("failed")).toBe(false);
  });

  it("writes a unique web markdown key so R2 updates do not collide", () => {
    const first = generateWebMarkdownKey("", "agent_1", "entry_1");
    const second = generateWebMarkdownKey("", "agent_1", "entry_1");
    expect(first).not.toBe(second);
    expect(first).toMatch(
      /^knowledge-base\/web-markdown\/personal\/agent_1\/entry_1\/[0-9a-f-]{36}\.md$/,
    );
    const persistSource = readFileSync(
      fileURLToPath(new URL("./persist.ts", import.meta.url)),
      "utf8",
    );
    expect(persistSource).toContain("mediaDeletePool.enqueueAction");
    expect(persistSource).toContain("mediaDeleteWorker");
    expect(persistSource).toContain("previousMarkdownR2Key");
  });

  it("includes a full markdown example with the required sections", () => {
    expect(WEBSITE_RESEARCH_INSTRUCTIONS).toContain("# Acme Clinic");
    expect(WEBSITE_RESEARCH_INSTRUCTIONS).toContain("## Overview");
    expect(WEBSITE_RESEARCH_INSTRUCTIONS).toContain("## Offerings");
    expect(WEBSITE_RESEARCH_INSTRUCTIONS).toContain("## Key facts");
    expect(WEBSITE_RESEARCH_INSTRUCTIONS).toContain("| Service | Price | Duration |");
    expect(WEBSITE_RESEARCH_INSTRUCTIONS).toContain("**How much is a check-up at Acme Clinic?**");
    expect(WEBSITE_RESEARCH_INSTRUCTIONS).toContain("## Limitations");
  });
});
