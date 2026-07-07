import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  buildWorkflowFinalResponseContractBlock,
  buildWorkflowRuntimeBlock,
} from "./workflowPrompt";

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

test("workflow runtime requires every matched node in workflow_matches", () => {
  const block = buildWorkflowRuntimeBlock(workflowWithTwoMediaNodes);

  expect(block).toContain("Multiple workflow node conditions can match in one turn");
  expect(block).toContain("Include every matching workflow node in `<workflow_matches>`");
  expect(block).toContain("Do not stop at the first match");
  expect(block).toContain("Execute every node listed in `<workflow_matches>`");
  expect(block).toContain("from each matching media node");
});

test("workflow final response contract models workflow_matches as an array", () => {
  const block = buildWorkflowFinalResponseContractBlock(workflowWithTwoMediaNodes);

  expect(block).toContain("Put only a JSON array inside `<workflow_matches>`");
  expect(block).toContain("Include every matching workflow node in `<workflow_matches>`");
  expect(block).toContain(`[
  { "matched": true, "nodeId": "video-node-id", "nodeKind": "sendImage", "nodeTitle": "Send Type B video" }
]`);
  expect(block).toContain(
    `{ "nodeId": "video-node-id", "url": "https://cdn.example.com/type-b.mp4", "type": "video/mp4" }`,
  );
});
