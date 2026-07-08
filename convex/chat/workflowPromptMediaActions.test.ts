import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { buildWorkflowRuntimeBlock } from "./workflowPrompt";

test("workflow runtime describes send photo nodes by media to send instead of goal", () => {
  const block = buildWorkflowRuntimeBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "media-node-id" as Id<"workflowNodes">,
        kind: "sendImage",
        title: "Send floor plan",
        goal: "Legacy custom goal should not steer this media node.",
        incomingConditions: [
          {
            sourceNodeId: "source-id" as Id<"workflowNodes">,
            name: "Customer asks for floor plan",
            detail: "If the customer asks to see the floor plan",
          },
        ],
        allowedServices: [],
        mediaAssets: [
          {
            clientId: "layout-client-id",
            filename: "Type A Layout.png",
            mediaType: "image/png",
            url: "https://cdn.example.com/type-a-layout.png",
          },
        ],
      },
    ],
  });

  expect(block).toContain("- Your Photos/Videos:");
  expect(block).toContain("Type A Layout.png");
  expect(block).not.toContain("- Goal:");
  expect(block).not.toContain("Legacy custom goal should not steer this media node.");
});

test("workflow runtime describes send file nodes by files to send instead of goal", () => {
  const block = buildWorkflowRuntimeBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "file-node-id" as Id<"workflowNodes">,
        kind: "sendFile",
        title: "Send brochure",
        goal: "Legacy file goal should not steer this media node.",
        incomingConditions: [],
        allowedServices: [],
        mediaAssets: [
          {
            clientId: "brochure-client-id",
            filename: "Arden Brochure.pdf",
            mediaType: "application/pdf",
            url: "https://cdn.example.com/arden-brochure.pdf",
          },
        ],
      },
    ],
  });

  expect(block).toContain("- Files to send:");
  expect(block).toContain("Arden Brochure.pdf");
  expect(block).not.toContain("- Goal:");
  expect(block).not.toContain("Legacy file goal should not steer this media node.");
});
