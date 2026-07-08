import { describe, expect, test } from "vitest";
import { AGENT_PROMPT_TEMPLATES } from "./agentPromptTemplates";

describe("shared agent prompt templates", () => {
  test("all creation templates use the public sample template structure", () => {
    for (const prompt of Object.values(AGENT_PROMPT_TEMPLATES)) {
      expect(prompt).toContain("# Role");
      expect(prompt).toContain("# About the business");
      expect(prompt).toContain("# Goal");
      expect(prompt).toContain("# Guardrails");
      expect(prompt).toContain("Use the business profile, uploaded knowledge, and conversation context");
      expect(prompt).toContain("# Error handling");
      expect(prompt).not.toContain("**Error handling:**");
      expect(prompt).toContain(
        "I'm unable to complete that right now. Let me escalate to a supervisor who can help.",
      );
      expect(prompt).not.toMatch(/refund/i);
      expect(prompt).not.toMatch(/^#\s*Workflow\b/im);
      expect(prompt).not.toMatch(/^#.*Workflow handling\b/im);
      expect(prompt).not.toContain("## When to use this workflow");
      expect(prompt).not.toContain("## How to follow the workflow");
      expect(prompt).not.toContain("Do not claim that an image, file, reminder, booking, payment, or other action was completed");
      expect(prompt).not.toContain("let the workflow handle the action");
      expect(prompt).not.toMatch(/^#\s*Tools\b/im);
      expect(prompt).not.toMatch(/^#\s*Tone\b/im);
      expect(prompt).not.toMatch(/^#\s*Environment\b/im);
    }
  });

  test("sales template is tailored to real estate showroom bookings", () => {
    expect(AGENT_PROMPT_TEMPLATES.sales).toContain(
      "AI agent for a business focused on booking appointments or selling products, specializing in booking appointments for real estate showroom viewings",
    );
    expect(AGENT_PROMPT_TEMPLATES.sales).toContain("real estate showroom viewing");
    expect(AGENT_PROMPT_TEMPLATES.sales).not.toContain("For this template");
  });

  test("real estate sales template guides unclear prospects without being pushy", () => {
    expect(AGENT_PROMPT_TEMPLATES.sales).toContain(
      "Do not be pushy, but in every message, try to guide the customer when they still have no clear intention.",
    );
    expect(AGENT_PROMPT_TEMPLATES.productSales).not.toContain("Do not be pushy");
  });

  test("product sales template is tailored to selling business products", () => {
    expect(AGENT_PROMPT_TEMPLATES.productSales).toContain(
      "AI agent for a business focused on selling products",
    );
    expect(AGENT_PROMPT_TEMPLATES.productSales).toContain("product catalog");
    expect(AGENT_PROMPT_TEMPLATES.productSales).not.toContain("real estate showroom");
  });
});
