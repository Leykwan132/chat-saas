import { describe, expect, test } from "vitest";
import { AGENT_TEMPLATES } from "./agentTemplates";

describe("agent prompt templates", () => {
  test("use clean ElevenLabs-style sections without tool, tone, or environment blocks", () => {
    for (const template of Object.values(AGENT_TEMPLATES)) {
      expect(template.prompt).toContain("# Role");
      expect(template.prompt).toContain("# About the business");
      expect(template.prompt).toContain("# Goal");
      expect(template.prompt).toContain("# Guardrails");
      expect(template.prompt).toContain("Use the business profile, uploaded knowledge, and conversation context");
      expect(template.prompt).toContain("# Error handling");
      expect(template.prompt).not.toContain("**Error handling:**");
      expect(template.prompt).toContain(
        "I'm unable to complete that right now. Let me escalate to a supervisor who can help.",
      );
      expect(template.prompt).not.toMatch(/refund/i);
      expect(template.prompt).not.toMatch(/^#\s*Workflow\b/im);
      expect(template.prompt).not.toMatch(/^#\s*Tools\b/im);
      expect(template.prompt).not.toMatch(/^#\s*Tone\b/im);
      expect(template.prompt).not.toMatch(/^#\s*Environment\b/im);
    }
  });

  test("omit workflow usage criteria from user-facing samples", () => {
    for (const template of Object.values(AGENT_TEMPLATES)) {
      expect(template.prompt).not.toContain("## When to use this workflow");
      expect(template.prompt).not.toContain("## How to follow the workflow");
    }
  });

  test("sales template is a real estate sales agent focused on showroom bookings", () => {
    expect(AGENT_TEMPLATES.sales.label).toBe("Real estate sales agent");
    expect(AGENT_TEMPLATES.sales.description).toContain("real estate showroom");
    expect(AGENT_TEMPLATES.sales.prompt).toContain(
      "AI agent for a business focused on booking appointments or selling products, specializing in booking appointments for real estate showroom viewings",
    );
    expect(AGENT_TEMPLATES.sales.prompt).toContain("real estate showroom viewing");
    expect(AGENT_TEMPLATES.sales.prompt).not.toContain("For this template");
    expect(AGENT_TEMPLATES.sales.prompt).toContain(
      "Do not be pushy, but in every message, try to guide the customer when they still have no clear intention.",
    );
  });

  test("product sales template is a sales agent focused on selling products", () => {
    expect(AGENT_TEMPLATES.productSales.label).toBe("Sales agent");
    expect(AGENT_TEMPLATES.productSales.description).toContain("sell products");
    expect(AGENT_TEMPLATES.productSales.prompt).toContain(
      "AI agent for a business focused on selling products",
    );
    expect(AGENT_TEMPLATES.productSales.prompt).toContain("product catalog");
    expect(AGENT_TEMPLATES.productSales.prompt).not.toContain("real estate showroom");
  });
});
