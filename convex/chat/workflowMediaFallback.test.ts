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
              url: "https://cdn.example.com/layout-a.png",
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
              url: "https://cdn.example.com/layout-a.png",
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
              url: "https://cdn.example.com/layout-a.png",
            },
          ],
        },
      ],
      edges: [],
    },
  );

  expect(ids).toEqual(["layout-a"]);
});

test("infers workflow video from the customer request when the reply only claims it was sent", () => {
  const ids = inferWorkflowMediaClientIdsFromReply(
    "Here it is again!",
    {
      workflowId: "workflow-1" as never,
      nodes: [
        {
          nodeId: "node-1" as never,
          kind: "sendImage",
          title: "Send Type B video",
          incomingConditions: [
            {
              sourceNodeId: "source-1" as never,
              name: "Customer asks for Type B video",
              detail: "If the customer asks to see or resend the Type B video",
            },
          ],
          allowedServices: [],
          mediaAssets: [
            {
              clientId: "type-b-video",
              filename: "Sena Residence Type B.mp4",
              mediaType: "video/mp4",
              url: "https://cdn.example.com/type-b-video.mp4",
            },
          ],
        },
      ],
      edges: [],
    },
    "Can you send the Sena Residence Type B video again?",
  );

  expect(ids).toEqual(["type-b-video"]);
});

test("infers workflow video from the exact plain reply when the model omits the manifest", () => {
  const ids = inferWorkflowMediaClientIdsFromReply(
    "Here's the Sena Residence Type B video again! 🎥\n\nLet me know if you need anything else! 😊",
    {
      workflowId: "workflow-1" as never,
      nodes: [
        {
          nodeId: "node-1" as never,
          kind: "sendFile",
          title: "Send Type B video",
          incomingConditions: [],
          allowedServices: [],
          mediaAssets: [
            {
              clientId: "type-b-video",
              filename: "Sena Residence Type B.mp4",
              mediaType: "video/mp4",
              url: "https://cdn.example.com/type-b-video.mp4",
            },
          ],
        },
      ],
      edges: [],
    },
  );

  expect(ids).toEqual(["type-b-video"]);
});
