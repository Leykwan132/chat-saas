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
    expect(prompt).toContain("Do not request passwords");
  });

  test("builds a safe booking prompt without an empty description", () => {
    const prompt = buildAgentSystemPrompt({
      businessName: "Glow Studio",
      goal: "bookService",
    });

    expect(prompt).toContain("help customers book services");
    expect(prompt).toContain("Do not claim a booking is confirmed");
    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("Business description:\n\n");
  });

  test("maps goals to compatible legacy template keys", () => {
    expect(templateKeyForAgentGoal("support")).toBe("support");
    expect(templateKeyForAgentGoal("bookService")).toBe("sales");
    expect(AGENT_GOAL_OPTIONS.bookService.label).toBe("Book a Service");
  });
});
