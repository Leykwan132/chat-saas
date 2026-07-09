import { Output } from "ai";
import { z } from "zod/v3";
import { dedupeMediaItems } from "./mediaToolResults";
import {
  filterWorkflowMediaManifestItems,
  type ManifestMediaItem,
} from "./mediaManifest";
import type { WorkflowRuntimeContextForPrompt } from "./workflowPrompt";

const workflowMatchSchema = z.object({
  matched: z.literal(true),
  nodeId: z.string(),
  nodeKind: z.string(),
  nodeTitle: z.string(),
});

const mediaToSendSchema = z.object({
  nodeId: z.string(),
  url: z.string(),
  type: z.string(),
});

export const aiReplyOutputSchema = z.object({
  workflowMatches: z.array(workflowMatchSchema).describe(
    "Every workflow node whose condition matches this turn. Use [] when none match.",
  ),
  customerResponse: z.string().describe(
    "Only the customer-visible reply text. Do not include internal workflow metadata, media URLs, or tags.",
  ),
  mediaToSend: z.array(mediaToSendSchema).describe(
    "Workflow media objects to send. The backend validates every item against the active workflow.",
  ),
});

export type AiReplyOutput = z.infer<typeof aiReplyOutputSchema>;

export const aiReplyStructuredOutput = Output.object({
  schema: aiReplyOutputSchema,
  name: "ai_reply",
  description: "Structured customer reply and workflow action metadata.",
});

export function extractAiReplyOutputMedia(
  output: AiReplyOutput,
  workflowRuntimeContext: WorkflowRuntimeContextForPrompt,
): {
  text: string;
  mediaItems: ManifestMediaItem[];
} {
  const mediaItems = output.mediaToSend.map((item) => ({
    nodeId: item.nodeId,
    url: item.url,
    mediaType: item.type,
  }));

  return {
    text: output.customerResponse.trim(),
    mediaItems: dedupeMediaItems(
      filterWorkflowMediaManifestItems(
        mediaItems,
        workflowRuntimeContext,
        output.workflowMatches,
      ),
    ),
  };
}
