import { expect, test } from "vitest";
import {
  buildWorkflowBackendHandlingBlock,
  buildWorkflowRuntimeBlock,
} from "./workflowPrompt";

test("backend workflow handling applies regardless of selected template", () => {
  const block = buildWorkflowBackendHandlingBlock();

  expect(block).toContain("## Workflow Handling");
  expect(block).toContain("These rules apply regardless of the selected agent template");
  expect(block).toContain("Do not claim that an action was completed unless the workflow or system confirms it");
  expect(block).toContain("collect only the required information");
  expect(block).toContain("let the workflow handle the action");
  expect(block).toContain("needs_reauthorization");
  expect(block).toContain("do not claim success");
});

test("runtime block includes backend workflow handling when no workflow exists", () => {
  const block = buildWorkflowRuntimeBlock(null);

  expect(block).toContain("## Workflow Handling");
  expect(block).toContain("These rules apply regardless of the selected agent template");
  expect(block).not.toContain("## Workflow Runtime");
});
