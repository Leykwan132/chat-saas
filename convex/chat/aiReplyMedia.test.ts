import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  extractAiReplyMedia,
  toChannelMediaItems,
} from "./aiReplyMedia";

const workflowContext = {
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
  ],
};

const fileWorkflowContext = {
  workflowId: "workflow-id" as Id<"workflows">,
  edges: [],
  nodes: [
    {
      nodeId: "file-node-id" as Id<"workflowNodes">,
      kind: "sendFile",
      title: "Send Sena Residence brochure",
      incomingConditions: [],
      allowedServices: [],
      mediaAssets: [
        {
          clientId: "brochure-file",
          filename: "Sena Residence brochure.pdf",
          mediaType: "application/pdf",
          url: "https://cdn.example.com/sena-brochure.pdf",
        },
      ],
    },
  ],
};

test("uses only media declared in media_to_send", () => {
  const result = extractAiReplyMedia(
    `<workflow_matches>
[
  { "matched": true, "nodeId": "media-node-id", "nodeKind": "sendImage", "nodeTitle": "Send Type B video" }
]
</workflow_matches>
<customer_response>
Here is a reference link: https://cdn.example.com/not-declared.mp4
</customer_response>
<media_to_send>
[
  { "nodeId": "media-node-id", "url": "https://cdn.example.com/type-b-video.mp4", "type": "video/mp4" }
]
</media_to_send>`,
    workflowContext,
  );

  expect(result).toEqual({
    text: "Here is a reference link: https://cdn.example.com/not-declared.mp4",
    mediaItems: [
      {
        url: "https://cdn.example.com/type-b-video.mp4",
        mediaType: "video/mp4",
        nodeId: "media-node-id",
      },
    ],
  });
});

test("does not infer media without workflow matches", () => {
  const result = extractAiReplyMedia(
    `<customer_response>
Here's the Sena Residence Type B video again.
</customer_response>
<media_to_send>
[]
</media_to_send>`,
    workflowContext,
  );

  expect(result).toEqual({
    text: "Here's the Sena Residence Type B video again.",
    mediaItems: [],
  });
});

test("adds missing media for matched workflow media nodes", () => {
  const result = extractAiReplyMedia(
    `<workflow_matches>
[
  { "matched": true, "nodeId": "media-node-id", "nodeKind": "sendImage", "nodeTitle": "Send Type B video" }
]
</workflow_matches>
<customer_response>
Here's the Sena Residence Type B video again.
</customer_response>
<media_to_send>
[]
</media_to_send>`,
    workflowContext,
  );

  expect(result).toEqual({
    text: "Here's the Sena Residence Type B video again.",
    mediaItems: [
      {
        url: "https://cdn.example.com/type-b-video.mp4",
        mediaType: "video/mp4",
        nodeId: "media-node-id",
      },
    ],
  });
});

test("keeps plain text replies sendable when the model skips the envelope", () => {
  const result = extractAiReplyMedia(
    "Here's the Sena Residence brochure for you!",
    fileWorkflowContext,
  );

  expect(result).toEqual({
    text: "Here's the Sena Residence brochure for you!",
    mediaItems: [],
  });
});

test("accepts send file media declared in media_to_send", () => {
  const result = extractAiReplyMedia(
    `<workflow_matches>
[
  { "matched": true, "nodeId": "file-node-id", "nodeKind": "sendFile", "nodeTitle": "Send Sena Residence brochure" }
]
</workflow_matches>
<customer_response>
Here's the Sena Residence brochure for you.
</customer_response>
<media_to_send>
[
  { "nodeId": "file-node-id", "url": "https://cdn.example.com/sena-brochure.pdf", "type": "application/pdf" }
]
</media_to_send>`,
    fileWorkflowContext,
  );

  expect(result).toEqual({
    text: "Here's the Sena Residence brochure for you.",
    mediaItems: [
      {
        url: "https://cdn.example.com/sena-brochure.pdf",
        mediaType: "application/pdf",
        nodeId: "file-node-id",
      },
    ],
  });
});

test("strips workflow node IDs before channel send action args", () => {
  expect(toChannelMediaItems([
    {
      nodeId: "workflow-node-id",
      url: "https://cdn.example.com/type-b-video.mp4",
      mediaType: "video/mp4",
    },
  ])).toEqual([
    {
      url: "https://cdn.example.com/type-b-video.mp4",
      mediaType: "video/mp4",
    },
  ]);
});
