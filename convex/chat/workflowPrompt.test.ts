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

test("workflow runtime tells media nodes to declare media on every matching customer request", () => {
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

  expect(block).toContain("include the media in `<media_to_send>` every time");
  expect(block).toContain("even if the same asset was sent earlier");
  expect(block).toContain("Do not answer that the media was already sent without declaring it");
  expect(block).not.toContain("sendMedia");
});

test("workflow runtime tells media nodes to declare final media in a manifest", () => {
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
            clientId: "brochure-client-id",
            filename: "Sena Brochure.pdf",
            mediaType: "application/pdf",
            url: "https://cdn.example.com/sena-brochure.pdf",
          },
        ],
      },
    ],
  });

  expect(block).toContain("<customer_response>");
  expect(block).toContain("<media_to_send>");
  expect(block).toContain('"nodeId": "media-node-id", "url": "https://cdn.example.com/sena-brochure.pdf"');
  expect(block).toContain('"type": "application/pdf"');
  expect(block).not.toContain('"clientId"');
  expect(block).not.toContain('"reason"');
  expect(block).toContain("The system strips these tags before sending");
});

test("workflow runtime makes send file nodes copy brochure file URLs into media_to_send", () => {
  const block = buildWorkflowRuntimeBlock({
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
            sourceNodeId: "source-id" as Id<"workflowNodes">,
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
            url: "https://cdn.example.com/sena-brochure.pdf",
          },
        ],
      },
    ],
  });

  expect(block).toContain("For sendFile nodes");
  expect(block).toContain("brochure, PDF, document, file, catalog, menu, or attachment");
  expect(block).toContain("Do not say \"Here's the brochure\", \"I've attached the file\", or similar unless");
  expect(block).toContain('"nodeId": "file-node-id", "url": "https://cdn.example.com/sena-brochure.pdf"');
  expect(block).toContain('"type": "application/pdf"');
});

test("workflow runtime requires workflow match array and media URL cross-check", () => {
  const block = buildWorkflowRuntimeBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "media-node-id" as Id<"workflowNodes">,
        kind: "sendImage",
        title: "Send Type B video",
        goal: "Send the requested Type B video.",
        incomingConditions: [
          {
            sourceNodeId: "source-id" as Id<"workflowNodes">,
            name: "Customer asks for Type B video",
            detail: "If the customer asks for Sena Residence Type B video, send this media.",
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
  });

  expect(block).toContain("<workflow_matches>");
  expect(block).toContain('"matched": true');
  expect(block).toContain('"nodeId": "media-node-id"');
  expect(block).toContain("After `fetchContext`, build `<workflow_matches>`");
  expect(block).toContain("If any item in `workflow_matches` has `nodeKind` `sendImage` or `sendFile`");
  expect(block).toContain("must contain at least one exact `nodeId`, `url`, and `type`");
});

test("workflow final response contract forbids plain text when media nodes exist", () => {
  const block = buildWorkflowFinalResponseContractBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "media-node-id" as Id<"workflowNodes">,
        kind: "sendFile",
        title: "Send Type B video",
        goal: "Send the requested Type B video.",
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
  });

  expect(block).toContain("## Final Response Contract — REQUIRED");
  expect(block).toContain("Never output plain text as the final answer");
  expect(block).toContain("<customer_response>");
  expect(block).toContain("<media_to_send>");
  expect(block).toContain('"nodeId": "media-node-id", "url": "https://cdn.example.com/type-b-video.mp4"');
  expect(block).toContain('"type": "video/mp4"');
  expect(block).not.toContain('"clientId"');
  expect(block).not.toContain('"reason"');
});

test("workflow final response contract includes workflow matches before media manifest", () => {
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

  expect(block.indexOf("<workflow_matches>")).toBeLessThan(
    block.indexOf("<customer_response>"),
  );
  expect(block).toContain('"matched": true');
  expect(block).toContain('"nodeKind": "sendFile"');
  expect(block).toContain('"nodeId": "media-node-id", "url": "https://cdn.example.com/sena-brochure.pdf"');
});

test("workflow final response contract explains data sources before constructing the envelope", () => {
  const block = buildWorkflowFinalResponseContractBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "media-node-id" as Id<"workflowNodes">,
        kind: "sendFile",
        title: "Send Type B video",
        goal: "Send the requested Type B video.",
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
  });

  expect(block).toContain("Build the final response from these data sources");
  expect(block).toContain("Workflow Runtime is the source of truth");
  expect(block).toContain("Media assets listed under each matching workflow media node are the only valid source");
  expect(block).toContain("Use `fetchContext` only for customer-facing facts");
  expect(block).toContain("After choosing the data, construct the final response envelope");
});

test("workflow final response contract is omitted when no media nodes exist", () => {
  expect(buildWorkflowFinalResponseContractBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "node-id" as Id<"workflowNodes">,
        kind: "sendText",
        title: "Send message",
        incomingConditions: [],
        allowedServices: [],
        mediaAssets: [],
      },
    ],
  })).toBe("");
});
