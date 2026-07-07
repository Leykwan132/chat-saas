import { dedupeMediaItems } from "./mediaToolResults";
import {
  extractMediaManifest,
  filterWorkflowMediaManifestItems,
  type ManifestMediaItem,
} from "./mediaManifest";
import type { WorkflowRuntimeContextForPrompt } from "./workflowPrompt";

export function toChannelMediaItems(mediaItems: ManifestMediaItem[]) {
  return mediaItems.map((item) => ({
    url: item.url,
    mediaType: item.mediaType,
  }));
}

export function extractAiReplyMedia(
  replyText: string,
  workflowRuntimeContext: WorkflowRuntimeContextForPrompt,
): {
  text: string;
  mediaItems: ManifestMediaItem[];
} {
  const mediaManifest = extractMediaManifest(replyText);
  return {
    text: mediaManifest.text,
    mediaItems: dedupeMediaItems(
      filterWorkflowMediaManifestItems(
        mediaManifest.mediaItems,
        workflowRuntimeContext,
        mediaManifest.workflowMatches,
      ),
    ),
  };
}
