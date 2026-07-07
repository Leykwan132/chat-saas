import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { buildWorkflowRuntimeBlock } from "./workflowPrompt";

test("workflow runtime tells send message nodes to send the configured message", () => {
  const block = buildWorkflowRuntimeBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "node-id" as Id<"workflowNodes">,
        kind: "sendText",
        title: "Send message",
        goal: "Thanks for reaching out. A teammate will follow up shortly.",
        incomingConditions: [
          {
            sourceNodeId: "source-id" as Id<"workflowNodes">,
            name: "After hours",
            detail: "If the customer messages outside business hours",
          },
        ],
        allowedServices: [],
        mediaAssets: [],
      },
    ],
  });

  expect(block).toContain("For Send message nodes");
  expect(block).toContain("send the configured message");
  expect(block).toContain("Thanks for reaching out");
});
