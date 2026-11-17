import { describe, expect, it } from "vitest";
import {
  integrationResultSchema,
  operationSchema,
  principalSchema,
} from "./contracts";

describe("integration contracts", () => {
  it("accepts bounded search and rejects model supplied identity", () => {
    const input = {
      operation: "search_conversations",
      agentId: "agent",
      query: "refund",
    };
    expect(operationSchema.parse(input)).toMatchObject({ limit: 10 });
    expect(
      operationSchema.safeParse({ ...input, userId: "other" }).success,
    ).toBe(false);
    expect(operationSchema.safeParse({ ...input, limit: 26 }).success).toBe(
      false,
    );
    expect(
      operationSchema.safeParse({ ...input, query: "x".repeat(201) }).success,
    ).toBe(false);
  });
  it("accepts snapshot input without caller-selected identity or filters", () => {
    expect(
      operationSchema.parse({
        operation: "get_agent_snapshot",
        agentId: "agent",
      }),
    ).toEqual({ operation: "get_agent_snapshot", agentId: "agent" });
    expect(
      operationSchema.safeParse({
        operation: "get_agent_snapshot",
        agentId: "agent",
        userId: "other",
      }).success,
    ).toBe(false);
  });
  it("rejects missing organization and unknown operations", () => {
    expect(principalSchema.safeParse({ subject: "user" }).success).toBe(false);
    expect(
      operationSchema.safeParse({ operation: "delete_conversation" }).success,
    ).toBe(false);
    expect(
      operationSchema.parse({ operation: "get_connection_context" }),
    ).toMatchObject({ agentLimit: 10 });
  });
  it("rejects private fields in tool output", () => {
    expect(
      integrationResultSchema.safeParse({
        operation: "get_connection_context",
        workspace: { id: "org", name: "Test" },
        nextCursor: null,
        items: [
          {
            agentId: "agent",
            name: "Support",
            capability: "conversations:read",
            systemPrompt: "private",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
