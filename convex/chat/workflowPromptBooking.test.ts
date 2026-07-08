import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { buildWorkflowRuntimeBlock } from "./workflowPrompt";

test("workflow runtime describes book appointment by services instead of goal", () => {
  const block = buildWorkflowRuntimeBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "booking-node-id" as Id<"workflowNodes">,
        kind: "bookAppointment",
        title: "Book appointment",
        goal: "Legacy booking goal should not steer this node.",
        incomingConditions: [
          {
            sourceNodeId: "source-id" as Id<"workflowNodes">,
            name: "Yes",
            detail: "If the customer wants to book one of the selected services.",
          },
        ],
        allowedServices: [
          {
            serviceId: "service-id" as Id<"appointmentServices">,
            name: "Showroom viewing",
            durationMinutes: 45,
            fields: [],
          },
        ],
        mediaAssets: [],
      },
    ],
  });

  expect(block).toContain("Name: Yes");
  expect(block).toContain("- Allowed Services:");
  expect(block).toContain("Showroom viewing");
  expect(block).not.toContain("- Goal:");
  expect(block).not.toContain("Legacy booking goal should not steer this node.");
});
