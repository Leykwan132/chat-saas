import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { buildWorkflowRuntimeBlock } from "./workflowPrompt";

test("workflow runtime marks the media planner rule as important", () => {
  const block = buildWorkflowRuntimeBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "media-node-id" as Id<"workflowNodes">,
        kind: "sendFile",
        title: "Send brochure",
        goal: "Send the requested brochure.",
        incomingConditions: [],
        allowedServices: [],
        mediaAssets: [
          {
            clientId: "brochure-file",
            filename: "Sena Residence Brochure.pdf",
            mediaType: "application/pdf",
            url: "https://cdn.example.com/sena-brochure.pdf",
          },
        ],
      },
    ],
  });

  expect(block).toContain(
    "This is important: for Send Photo/Video and Send Files nodes",
  );
  expect(block).toContain("the backend validates the matched workflow node and sends the assets separately");
});
