import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { buildWorkflowRuntimeBlock } from "./workflowPrompt";

const workflowWithTwoMediaNodes = {
  workflowId: "workflow-id" as Id<"workflows">,
  edges: [],
  nodes: [
    {
      nodeId: "video-node-id" as Id<"workflowNodes">,
      kind: "sendImage",
      title: "Send Type B video",
      goal: "Send the requested Type B video.",
      incomingConditions: [
        {
          sourceNodeId: "source-node-id" as Id<"workflowNodes">,
          name: "Customer asks for Type B video",
          detail: "If the customer asks for the Type B video, send this media.",
        },
      ],
      allowedServices: [],
      mediaAssets: [
        {
          clientId: "type-b-video",
          filename: "Type B.mp4",
          mediaType: "video/mp4",
          url: "https://cdn.example.com/type-b.mp4",
        },
      ],
    },
    {
      nodeId: "brochure-node-id" as Id<"workflowNodes">,
      kind: "sendFile",
      title: "Send brochure",
      goal: "Send the requested brochure.",
      incomingConditions: [
        {
          sourceNodeId: "source-node-id" as Id<"workflowNodes">,
          name: "Customer asks for brochure",
          detail: "If the customer asks for the brochure, send this file.",
        },
      ],
      allowedServices: [],
      mediaAssets: [
        {
          clientId: "brochure",
          filename: "Brochure.pdf",
          mediaType: "application/pdf",
          url: "https://cdn.example.com/brochure.pdf",
        },
      ],
    },
  ],
};

test("workflow runtime requires following every matching node", () => {
  const block = buildWorkflowRuntimeBlock(workflowWithTwoMediaNodes);

  expect(block).toContain("Multiple workflow node conditions can match in one turn");
  expect(block).toContain("Follow every matching node");
  expect(block).toContain("do not stop at the first match");
  expect(block).toContain("Let the backend workflow planner handle reliable action metadata and media sending");
  expect(block).toContain("the backend validates the matched workflow node and sends the assets separately");
  expect(block).not.toContain("<workflow_matches>");
});

test("workflow runtime lists media assets by node-owned client IDs", () => {
  const block = buildWorkflowRuntimeBlock(workflowWithTwoMediaNodes);

  expect(block).toContain("Node ID: video-node-id");
  expect(block).toContain("clientId: type-b-video, file: Type B.mp4, type: video/mp4");
  expect(block).toContain("Node ID: brochure-node-id");
  expect(block).toContain("clientId: brochure, file: Brochure.pdf, type: application/pdf");
  expect(block).not.toContain("https://cdn.example.com/type-b.mp4");
  expect(block).not.toContain("https://cdn.example.com/brochure.pdf");
});
