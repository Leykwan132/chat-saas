import type { WorkflowRuntimeContextForPrompt } from "./workflowPrompt";
import { dedupeMediaItems } from "./mediaToolResults";
import type { ManifestMediaItem } from "./mediaManifest";

const MEDIA_NODE_KINDS = new Set(["sendImage", "sendFile"]);

type WorkflowMatch = {
  matched: true;
  nodeId: string;
  nodeKind: string;
  nodeTitle: string;
};

type WorkflowActionPlanShape = {
  workflowMatches: WorkflowMatch[];
  mediaNodeIdsToSend: string[];
  responseGuidance: string;
};

type WorkflowNode = NonNullable<WorkflowRuntimeContextForPrompt>["nodes"][number];

export function getPlannableWorkflowActionNodes(
  context: WorkflowRuntimeContextForPrompt,
) {
  if (context === null) return [];
  return context.nodes.filter((node) =>
    isMediaNodeWithAssets(node) || isSendTextNodeWithMessage(node)
  );
}

export function shouldRunWorkflowActionPlanner(
  context: WorkflowRuntimeContextForPrompt,
) {
  return getPlannableWorkflowActionNodes(context).length > 0;
}

export function reconcileWorkflowActionPlan<T extends WorkflowActionPlanShape>(
  plan: T,
  context: WorkflowRuntimeContextForPrompt,
): T {
  const requestedNodeIds = new Set(
    plan.workflowMatches.map((match) => match.nodeId.trim()).filter(Boolean),
  );
  const workflowMatches = getPlannableWorkflowActionNodes(context)
    .filter((node) => requestedNodeIds.has(node.nodeId.toString()))
    .map((node): WorkflowMatch => ({
      matched: true,
      nodeId: node.nodeId.toString(),
      nodeKind: node.kind,
      nodeTitle: node.title,
    }));
  const mediaNodeIdsToSend = workflowMatches
    .filter((match) => MEDIA_NODE_KINDS.has(match.nodeKind))
    .map((match) => match.nodeId);

  return {
    ...plan,
    workflowMatches,
    mediaNodeIdsToSend,
  };
}

export function getMatchedWorkflowActionNodes(
  plan: WorkflowActionPlanShape,
  context: WorkflowRuntimeContextForPrompt,
) {
  const matchedNodeIds = new Set(
    plan.workflowMatches.map((match) => match.nodeId.trim()).filter(Boolean),
  );
  return getPlannableWorkflowActionNodes(context).filter((node) =>
    matchedNodeIds.has(node.nodeId.toString())
  );
}

export function resolveWorkflowActionPlanMedia(
  plan: WorkflowActionPlanShape,
  context: WorkflowRuntimeContextForPrompt,
) {
  const mediaItems = getMatchedWorkflowActionNodes(plan, context)
    .filter((node) => isMediaNodeWithAssets(node))
    .flatMap((node): ManifestMediaItem[] =>
      node.mediaAssets.map((asset) => ({
        nodeId: node.nodeId.toString(),
        url: asset.url,
        mediaType: asset.mediaType,
      })),
    );

  return dedupeMediaItems(mediaItems);
}

export function resolveWorkflowActionPlanText(
  plan: WorkflowActionPlanShape,
  context: WorkflowRuntimeContextForPrompt,
) {
  const messages = getMatchedWorkflowActionNodes(plan, context)
    .filter((node) => isSendTextNodeWithMessage(node))
    .map((node) => node.textToSend!.trim());
  return messages.length > 0 ? messages.join("\n\n") : null;
}

function isMediaNodeWithAssets(node: WorkflowNode) {
  return MEDIA_NODE_KINDS.has(node.kind) && node.mediaAssets.length > 0;
}

function isSendTextNodeWithMessage(node: WorkflowNode) {
  return node.kind === "sendText" && Boolean(node.textToSend?.trim());
}
