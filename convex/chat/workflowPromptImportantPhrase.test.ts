import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { buildWorkflowFinalResponseContractBlock } from "./workflowPrompt";

test("workflow final response contract marks the media manifest rule as important", () => {
  const block = buildWorkflowFinalResponseContractBlock({
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
    "This is important: if a Send Photo/Video or Send Files node matches",
  );
});
