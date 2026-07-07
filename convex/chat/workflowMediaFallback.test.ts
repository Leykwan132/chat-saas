import { expect, test } from "vitest";
import { inferWorkflowMediaClientIdsFromReply } from "./workflowMediaFallback";

test("infers workflow media from a matching layout filename in the reply", () => {
  const ids = inferWorkflowMediaClientIdsFromReply(
    "Here you go — the *Sena Residence Type A Layout*! 🏠✨",
    {
      workflowId: "workflow-1" as never,
      nodes: [
        {
          nodeId: "node-1" as never,
          kind: "sendImage",
          title: "Send Type A layout",
          goal: "Send the requested Sena Residence floor plan",
          incomingConditions: [],
          allowedServices: [],
          mediaAssets: [
            {
              clientId: "layout-a",
              filename: "Sena Residence Type A Layout.png",
              mediaType: "image/png",
            },
          ],
        },
      ],
      edges: [],
    },
  );

  expect(ids).toEqual(["layout-a"]);
});

test("does not infer media when the reply does not reference a ready asset", () => {
  const ids = inferWorkflowMediaClientIdsFromReply(
    "Sena Residence is located in Shah Alam.",
    {
      workflowId: "workflow-1" as never,
      nodes: [
        {
          nodeId: "node-1" as never,
          kind: "sendImage",
          title: "Send Type A layout",
          incomingConditions: [],
          allowedServices: [],
          mediaAssets: [
            {
              clientId: "layout-a",
              filename: "Sena Residence Type A Layout.png",
              mediaType: "image/png",
            },
          ],
        },
      ],
      edges: [],
    },
  );

  expect(ids).toEqual([]);
});

test("infers workflow media from send node titles without requiring the action verb", () => {
  const ids = inferWorkflowMediaClientIdsFromReply(
    "Here you go — the *Sena Residence Type A Layout*!",
    {
      workflowId: "workflow-1" as never,
      nodes: [
        {
          nodeId: "node-1" as never,
          kind: "sendImage",
          title: "Send Sena Residence Type A Layout",
          incomingConditions: [],
          allowedServices: [],
          mediaAssets: [
            {
              clientId: "layout-a",
              filename: "layout.png",
              mediaType: "image/png",
            },
          ],
        },
      ],
      edges: [],
    },
  );

  expect(ids).toEqual(["layout-a"]);
});
