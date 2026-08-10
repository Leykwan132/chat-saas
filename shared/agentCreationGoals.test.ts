import { describe, expect, test } from "vitest";
import {
  AGENT_GOAL_OPTIONS,
  buildAgentSystemPrompt,
  templateKeyForAgentGoal,
} from "./agentCreationGoals";

describe("agent creation goals", () => {
  test("builds a business-specific support prompt", () => {
    const prompt = buildAgentSystemPrompt({
      businessName: " Northstar Dental ",
      businessDescription: " Family dental care in Kuala Lumpur. ",
      goal: "support",
    });

    expect(prompt).toContain("Northstar Dental");
    expect(prompt).toContain("Family dental care in Kuala Lumpur.");
    expect(prompt).toContain("customer support AI agent");
    expect(prompt).toContain(
      "Answer customer questions clearly, collect useful details when needed, and guide the customer to the next helpful step.",
    );
    expect(prompt).toContain("# Conversation approach");
    expect(prompt).toContain(
      "Do not open by pushing a booking, demo, plan, or other next step. First understand the customer's needs, then introduce the relevant option when it genuinely helps.",
    );
    expect(prompt).toContain("Do not request passwords");
    expect(prompt).not.toContain("# Role\n\n");
    expect(prompt).not.toContain("# About the business\n\n");
    expect(prompt).not.toContain("# Goal\n\n");
    expect(prompt).not.toContain("# Guardrails\n\n");
    expect(prompt).not.toContain("# Error handling\n\n");
  });

  test("builds a safe booking prompt without an empty description", () => {
    const prompt = buildAgentSystemPrompt({
      businessName: "Glow Studio",
      businessDescription: "Beauty services in Kuala Lumpur.",
      goal: "bookService",
    });

    expect(prompt).toContain("help customers book services");
    expect(prompt).toContain("Do not claim a booking is confirmed");
    expect(prompt).toContain("# Conversation approach");
    expect(prompt).toContain(
      "Do not open by pushing a booking, demo, plan, or other next step. First understand the customer's needs, then introduce the relevant option when it genuinely helps.",
    );
    expect(prompt).toContain(
      "Do not overwhelm the customer by listing every feature, service, plan, or option. Introduce only what is relevant to their needs and context.",
    );
    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("Business description:\n\n");
  });

  test("maps goals to compatible legacy template keys", () => {
    expect(templateKeyForAgentGoal("support")).toBe("support");
    expect(templateKeyForAgentGoal("bookService")).toBe("sales");
    expect(AGENT_GOAL_OPTIONS.bookService.label).toBe("Book a Service");
  });
});
