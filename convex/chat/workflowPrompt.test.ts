import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  buildWorkflowFinalResponseContractBlock,
  buildWorkflowRuntimeBlock,
} from "./workflowPrompt";

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

  expect(block).toContain("### When to use workflow nodes");
  expect(block).toContain("### How to follow the workflow");
  expect(block).toContain("### Workflow guardrails");
  expect(block).toContain("For Send message nodes");
  expect(block).toContain("send the configured message");
  expect(block).toContain("Thanks for reaching out");
});

test("workflow runtime delegates media sends to the backend planner", () => {
  const block = buildWorkflowRuntimeBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "media-node-id" as Id<"workflowNodes">,
        kind: "sendImage",
        title: "Send floor plan",
        goal: "Send the matching floor plan when requested.",
        incomingConditions: [
          {
            sourceNodeId: "source-id" as Id<"workflowNodes">,
            name: "Customer asks for floor plan",
            detail: "If the customer asks to see or resend the floor plan",
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

  expect(block).toContain("This is important: for Send Photo/Video and Send Files nodes");
  expect(block).toContain("even if the same asset was sent earlier");
  expect(block).toContain("the backend validates the matched workflow node and sends the assets separately");
  expect(block).toContain("clientId: layout-client-id");
  expect(block).not.toContain("https://cdn.example.com/type-a-layout.png");
  expect(block).not.toContain("<media_to_send>");
  expect(block).not.toContain("sendMedia");
});

test("workflow runtime makes send file nodes use uploaded file assets without exposing URLs", () => {
  const block = buildWorkflowRuntimeBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "file-node-id" as Id<"workflowNodes">,
        kind: "sendFile",
        title: "Send Arden Heights Brochure",
        goal: "Send node-owned files or documents to the customer when this condition matches.",
        incomingConditions: [
          {
            sourceNodeId: "source-id" as Id<"workflowNodes">,
            name: "A brochure of Arden Heights",
            detail: "If the user asks for a brochure for Arden Heights, send this file.",
          },
        ],
        allowedServices: [],
        mediaAssets: [
          {
            clientId: "brochure-client-id",
            filename: "Arden_Brochure.pdf",
            mediaType: "application/pdf",
            url: "https://cdn.example.com/arden-brochure.pdf",
          },
        ],
      },
    ],
  });

  expect(block).toContain("For sendFile nodes");
  expect(block).toContain("brochure, PDF, document, file, catalog, menu, or attachment");
  expect(block).toContain("clientId: brochure-client-id, file: Arden_Brochure.pdf, type: application/pdf");
  expect(block).toContain("Do not say \"Here's the brochure\", \"I've attached the file\", or similar unless");
  expect(block).not.toContain("https://cdn.example.com/arden-brochure.pdf");
  expect(block).not.toContain("<customer_response>");
});

test("workflow runtime tells the model to follow every matching node without tag envelopes", () => {
  const block = buildWorkflowRuntimeBlock({
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
            sourceNodeId: "source-id" as Id<"workflowNodes">,
            name: "Customer asks for Type B video",
            detail: "If the customer asks for Arden Heights Type B video, send this media.",
          },
        ],
        allowedServices: [],
        mediaAssets: [
          {
            clientId: "type-b-video",
            filename: "Arden Heights Type B.mp4",
            mediaType: "video/mp4",
            url: "https://cdn.example.com/type-b-video.mp4",
          },
        ],
      },
    ],
  });

  expect(block).toContain("Multiple workflow node conditions can match in one turn");
  expect(block).toContain("Follow every matching node");
  expect(block).toContain("do not stop at the first match");
  expect(block).toContain("Let the backend workflow planner handle reliable action metadata and media sending");
  expect(block).not.toContain("<workflow_matches>");
});

test("workflow final response prompt contract is omitted because output is structured in code", () => {
  expect(buildWorkflowFinalResponseContractBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "node-id" as Id<"workflowNodes">,
        kind: "sendFile",
        title: "Send brochure",
        incomingConditions: [],
        allowedServices: [],
        mediaAssets: [],
      },
    ],
  })).toBe("");
});
