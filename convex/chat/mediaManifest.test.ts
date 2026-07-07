import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  extractMediaManifest,
  filterWorkflowMediaManifestItems,
} from "./mediaManifest";

test("extracts customer text and media URL items from object manifest", () => {
  const result = extractMediaManifest(`<customer_response>
Sure! Here's the Type B video again.
</customer_response>

<media_to_send>
[
  { "nodeId": "media-node-id", "url": "https://cdn.example.com/type-b-video.mp4", "type": "video/mp4" }
]
</media_to_send>`);

  expect(result).toEqual({
    text: "Sure! Here's the Type B video again.",
    mediaItems: [
      {
        url: "https://cdn.example.com/type-b-video.mp4",
        mediaType: "video/mp4",
        nodeId: "media-node-id",
      },
    ],
    workflowMatches: [],
  });
});

test("strips workflow match array while extracting media manifest", () => {
  const result = extractMediaManifest(`<workflow_matches>
[
  { "matched": true, "nodeId": "media-node-id", "nodeKind": "sendImage", "nodeTitle": "Send Type B video" }
]
</workflow_matches>
<customer_response>
Sure! Here's the Type B video again.
</customer_response>
<media_to_send>
[
  { "nodeId": "media-node-id", "url": "https://cdn.example.com/type-b-video.mp4", "type": "video/mp4" }
]
</media_to_send>`);

  expect(result).toEqual({
    text: "Sure! Here's the Type B video again.",
    mediaItems: [
      {
        url: "https://cdn.example.com/type-b-video.mp4",
        mediaType: "video/mp4",
        nodeId: "media-node-id",
      },
    ],
    workflowMatches: [
      {
        matched: true,
        nodeId: "media-node-id",
        nodeKind: "sendImage",
        nodeTitle: "Send Type B video",
      },
    ],
  });
});

test("does not expose workflow match array when customer response is missing", () => {
  const result = extractMediaManifest(`<workflow_matches>
[
  { "matched": true, "nodeId": "media-node-id", "nodeKind": "sendImage", "nodeTitle": "Send Type B video" }
]
</workflow_matches>
Here is the video.
<media_to_send>
[]
</media_to_send>`);

  expect(result).toEqual({
    text: "Here is the video.",
    mediaItems: [],
    workflowMatches: [
      {
        matched: true,
        nodeId: "media-node-id",
        nodeKind: "sendImage",
        nodeTitle: "Send Type B video",
      },
    ],
  });
});

test("does not extract media manifest entries without node IDs", () => {
  const result = extractMediaManifest(`Here is the brochure.

<media_to_send>
[
  { "url": "https://cdn.example.com/sena-brochure.pdf", "type": "application/pdf" },
  { "clientId": "brochure-pdf" }
]
</media_to_send>`);

  expect(result).toEqual({
    text: "Here is the brochure.",
    mediaItems: [],
    workflowMatches: [],
  });
});

test("extracts media URL items from fenced JSON manifest", () => {
  const result = extractMediaManifest(`Here is the video.

<media_to_send>
\`\`\`json
[
  { "nodeId": "media-node-id", "url": "https://cdn.example.com/type-b-video.mp4", "type": "video/mp4" }
]
\`\`\`
</media_to_send>`);

  expect(result).toEqual({
    text: "Here is the video.",
    mediaItems: [
      {
        url: "https://cdn.example.com/type-b-video.mp4",
        mediaType: "video/mp4",
        nodeId: "media-node-id",
      },
    ],
    workflowMatches: [],
  });
});

test("extracts customer text when media manifest is an empty array", () => {
  const result = extractMediaManifest(`<customer_response>
Thanks for reaching out. How can I help?
</customer_response>

<media_to_send>
[]
</media_to_send>`);

  expect(result).toEqual({
    text: "Thanks for reaching out. How can I help?",
    mediaItems: [],
    workflowMatches: [],
  });
});

test("does not expose malformed manifest content to the customer", () => {
  const result = extractMediaManifest(`Here is the video.

<media_to_send>
[{ "url": "https://cdn.example.com/type-b-video.mp4", "type": "video/mp4" }
</media_to_send>`);

  expect(result).toEqual({
    text: "Here is the video.",
    mediaItems: [],
    workflowMatches: [],
  });
});

test("reconciles matched workflow media nodes after manifest extraction", () => {
  const context = {
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "media-node-id" as Id<"workflowNodes">,
        kind: "sendImage",
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
      {
        nodeId: "message-node-id" as Id<"workflowNodes">,
        kind: "sendText",
        title: "Send message",
        incomingConditions: [],
        allowedServices: [],
        mediaAssets: [
          {
            clientId: "not-sendable-from-text-node",
            filename: "Hidden.pdf",
            mediaType: "application/pdf",
            url: "https://cdn.example.com/hidden.pdf",
          },
        ],
      },
    ],
  };

  expect(
    filterWorkflowMediaManifestItems(
      [
        {
          nodeId: "media-node-id",
          url: "https://cdn.example.com/unknown.mp4",
          mediaType: "video/mp4",
        },
        {
          nodeId: "message-node-id",
          url: "https://cdn.example.com/hidden.pdf",
          mediaType: "application/pdf",
        },
      ],
      context,
      [
        {
          matched: true,
          nodeId: "media-node-id",
          nodeKind: "sendImage",
          nodeTitle: "Send Type B video",
        },
      ],
    ),
  ).toEqual([
    {
      url: "https://cdn.example.com/type-b-video.mp4",
      mediaType: "video/mp4",
      nodeId: "media-node-id",
    },
  ]);
});
