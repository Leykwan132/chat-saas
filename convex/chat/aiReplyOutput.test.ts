import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  aiReplyOutputSchema,
  extractAiReplyOutputMedia,
} from "./aiReplyOutput";

const workflowContext = {
  workflowId: "workflow-id" as Id<"workflows">,
  edges: [],
  nodes: [
    {
      nodeId: "media-node-id" as Id<"workflowNodes">,
      kind: "sendFile",
      title: "Send brochure",
      incomingConditions: [],
      allowedServices: [],
      mediaAssets: [
        {
          clientId: "brochure-client-id",
          filename: "Arden Heights Brochure.pdf",
          mediaType: "application/pdf",
          url: "https://cdn.example.com/arden-brochure.pdf",
        },
      ],
    },
  ],
};

test("validates final AI reply with structured output schema", () => {
  const output = aiReplyOutputSchema.parse({
    workflowMatches: [
      {
        matched: true,
        nodeId: "media-node-id",
        nodeKind: "sendFile",
        nodeTitle: "Send brochure",
      },
    ],
    customerResponse: "Here is the brochure.",
    mediaToSend: [
      {
        nodeId: "media-node-id",
        url: "https://cdn.example.com/arden-brochure.pdf",
        type: "application/pdf",
      },
    ],
  });

  expect(output.customerResponse).toBe("Here is the brochure.");
  expect(() =>
    aiReplyOutputSchema.parse({
      customerResponse: "Missing workflow metadata.",
      mediaToSend: [],
    }),
  ).toThrow();
});

test("resolves structured output media through workflow context", () => {
  const reply = extractAiReplyOutputMedia(
    {
      workflowMatches: [
        {
          matched: true,
          nodeId: "media-node-id",
          nodeKind: "sendFile",
          nodeTitle: "Send brochure",
        },
      ],
      customerResponse: "Here is the brochure.",
      mediaToSend: [
        {
          nodeId: "media-node-id",
          url: "https://cdn.example.com/arden-brochure.pdf",
          type: "application/pdf",
        },
        {
          nodeId: "media-node-id",
          url: "https://evil.example.com/fake.pdf",
          type: "application/pdf",
        },
      ],
    },
    workflowContext,
  );

  expect(reply).toEqual({
    text: "Here is the brochure.",
    mediaItems: [
      {
        nodeId: "media-node-id",
        url: "https://cdn.example.com/arden-brochure.pdf",
        mediaType: "application/pdf",
      },
    ],
  });
});
