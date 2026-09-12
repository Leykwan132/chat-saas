import { expect, test } from "vitest";
import { buildToolUsageBlock } from "./toolPrompt";

test("tool usage block follows a when/how/parameters/error handling pattern", () => {
  const block = buildToolUsageBlock({
    escalationConfigured: true,
    hasWorkflowMediaNodes: true,
    noContextFallback: "call `escalateToHuman` with the user's question.",
  });

  expect(block).toContain("## Tool Usage — REQUIRED");
  expect(block).not.toContain("fetchCustomerQa");
  expect(block).toContain("### `fetchContext`");
  expect(block).toContain("**When to use:**");
  expect(block).toContain("**How to use:**");
  expect(block).toContain("**Parameters:**");
  expect(block).toContain("# Error handling");
  expect(block).not.toContain("**Error handling:**");
  expect(block).toContain("### `escalateToHuman`");
  expect(block).toContain("### Workflow-aware response order");
  expect(block).toContain("Follow every matching workflow node");
  expect(block).toContain("the backend workflow planner sends the assets separately");
  expect(block).toContain(
    "Call `fetchContext` with a query that describes the context you need before answering any customer question.",
  );
});

test("tool usage block omits escalation tool instructions when escalation is unavailable", () => {
  const block = buildToolUsageBlock({
    escalationConfigured: false,
    hasWorkflowMediaNodes: false,
    noContextFallback: "give a short, natural reply that you don't have that information",
  });

  expect(block).toContain("### `fetchContext`");
  expect(block).not.toContain("### `escalateToHuman`");
  expect(block).not.toContain("fetchCustomerQa");
  expect(block).toContain(
    "Call `fetchContext` with a query that describes the context you need before answering any customer question.",
  );
});
