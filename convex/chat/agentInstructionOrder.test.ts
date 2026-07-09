import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { buildWorkflowOutputContractBlocks } from "./threads";

test("omits prompt-level output contract because AI replies use structured output", () => {
  const blocks = buildWorkflowOutputContractBlocks({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "file-node-id" as Id<"workflowNodes">,
        kind: "sendFile",
        title: "Send Sena Residence Brochure",
        goal: "Send node-owned files or documents to the customer when this condition matches.",
        incomingConditions: [
          {
            sourceNodeId: "source-node-id" as Id<"workflowNodes">,
            name: "A brochure of Sena Residence",
            detail: "If the user asks for a brochure for Sena residence, send this file.",
          },
        ],
        allowedServices: [],
        mediaAssets: [
          {
            clientId: "brochure-client-id",
            filename: "LinkedIn_Posts__6_.pdf",
            mediaType: "application/pdf",
            url: "https://storage.kilobot.app/workflow-media/brochure.pdf",
          },
        ],
      },
    ],
  });

  expect(blocks).toBe("");
});
