import { z } from "zod/v3";
import type { ActionCtx } from "../_generated/server";
import type { buildAgent } from "./threads";
import { dedupeMediaItems } from "./mediaToolResults";
import type { ManifestMediaItem } from "./mediaManifest";
import type { WorkflowRuntimeContextForPrompt } from "./workflowPrompt";

const MEDIA_NODE_KINDS = new Set(["sendImage", "sendFile"]);

export const workflowActionPlanSchema = z.object({
  workflowMatches: z.array(
    z.object({
      matched: z.literal(true).describe("Always true for every workflow node included in this plan."),
      nodeId: z.string().describe("The exact Workflow Runtime node ID copied from the matching media node."),
      nodeKind: z.string().describe("The matching Workflow Runtime node kind, such as sendImage or sendFile."),
      nodeTitle: z.string().describe("The matching Workflow Runtime node title copied exactly from the workflow."),
    }).describe("A matching workflow media node that should be considered for this turn."),
  ).describe("Every matching workflow media node whose condition or customer intent matches this turn."),
  mediaNodeIdsToSend: z.array(
    z.string().describe("A Workflow Runtime media node ID whose uploaded assets should be sent now."),
  ).describe("Node IDs for workflow media nodes whose assets the backend must send now."),
  responseGuidance: z.string().describe(
    "A short instruction for the later customer-visible reply, without URLs or internal metadata.",
  ),
});

export type WorkflowActionPlan = z.infer<typeof workflowActionPlanSchema>;

type WorkflowNode = NonNullable<WorkflowRuntimeContextForPrompt>["nodes"][number];

export type AiReplyPromptArgs = {
  promptContent?: string;
  promptMessageId?: string;
};

export function aiReplyPromptArgs(args: AiReplyPromptArgs) {
  if (args.promptMessageId) return { promptMessageId: args.promptMessageId };
  if (args.promptContent) return { prompt: args.promptContent };
  throw new Error("Either promptMessageId or promptContent must be provided");
}

export function workflowActionPlanReplyPromptArgs(
  args: AiReplyPromptArgs,
  plan: WorkflowActionPlan,
) {
  return {
    ...aiReplyPromptArgs(args),
    messages: [
      {
        role: "system" as const,
        content: buildWorkflowActionPlanReplyGuidance(plan),
      },
    ],
  };
}

export function buildWorkflowActionPlanReplyGuidance(plan: WorkflowActionPlan) {
  const selectedNodeIds = new Set(
    plan.mediaNodeIdsToSend.map((nodeId) => nodeId.trim()).filter(Boolean),
  );
  const selectedTitles = plan.workflowMatches
    .filter((match) => selectedNodeIds.has(match.nodeId))
    .map((match) => match.nodeTitle.trim())
    .filter(Boolean);
  const selectedList = selectedTitles.length > 0
    ? selectedTitles.map((title) => `  - ${title}`).join("\n")
    : "  - Selected workflow media node IDs are listed in mediaNodeIdsToSend.";

  if (selectedNodeIds.size === 0) {
    return [
      "Workflow action plan for this reply:",
      `- Planner guidance: ${plan.responseGuidance}`,
      "- No workflow media is being sent in this turn.",
      "- Do not claim that an image, video, file, brochure, or attachment is attached or sent unless it is selected to send.",
    ].join("\n");
  }

  return [
    "Workflow action plan for this reply:",
    `- Planner guidance: ${plan.responseGuidance}`,
    "- The backend is sending the selected workflow media now.",
    "- Selected media being sent:",
    selectedList,
    "- This is important: write the customer-visible response as an action already happening.",
    "- Do not ask whether the customer wants you to send it.",
    '- Do not say "I can send it", "Would you like me to send it", or "Let me know if you want me to send it" for selected media.',
    "- Do not say selected-but-unsent workflow matches are being sent.",
  ].join("\n");
}

export function shouldRunWorkflowActionPlanner(context: WorkflowRuntimeContextForPrompt) {
  return getMediaNodesWithAssets(context).length > 0;
}

export function buildWorkflowActionPlannerSystemPrompt(
  context: WorkflowRuntimeContextForPrompt,
) {
  const mediaNodes = getMediaNodesWithAssets(context);
  if (mediaNodes.length === 0) return "";

  const nodeSections = mediaNodes.map((node, index) => {
    const incoming = node.incomingConditions.length === 0
      ? "- Incoming conditions: message enters here"
      : [
          "- Incoming conditions:",
          ...node.incomingConditions.map((condition) => {
            const name = condition.name?.trim();
            const detail = condition.detail?.trim();
            if (name && detail) return `  - Name: ${name}; Detail: ${detail}`;
            if (name) return `  - Name: ${name}`;
            if (detail) return `  - Detail: ${detail}`;
            return "  - No explicit condition";
          }),
        ].join("\n");
    const assets = node.mediaAssets.map((asset) => {
      const filename = asset.filename ? `, filename: ${asset.filename}` : "";
      return `  - clientId: ${asset.clientId}${filename}, type: ${asset.mediaType}`;
    });

    return [
      `### ${index + 1}. ${node.title}`,
      `- Node ID: ${node.nodeId}`,
      `- Kind: ${node.kind}`,
      incoming,
      "- Media assets:",
      ...assets,
    ].join("\n");
  }).join("\n\n");

  return `You are a structured workflow action planner.
Analyze the current conversation and latest customer message. Decide whether any Workflow Runtime media node should send its assets now.

Return a strict object matching the schema:
- workflowMatches: every workflow media node whose condition/customer intent matches this turn.
- mediaNodeIdsToSend: node IDs for media nodes whose assets must be sent now.
- responseGuidance: one short instruction for the later customer-visible reply.

Rules:
- Do not return media URLs. The backend resolves URLs from node IDs.
- Use only exact Node IDs listed below.
- Use an empty mediaNodeIdsToSend array when no workflow media should be sent.
- If mediaNodeIdsToSend is not empty, responseGuidance must say the selected media is being sent now instead of asking whether to send it.
- If a customer asks again for a matching photo, video, brochure, PDF, document, file, catalog, menu, or attachment, include that matching media node ID again.
- Ignore non-media requests unless they clearly ask for a listed media asset.

Workflow media nodes:
${nodeSections}`;
}

export function resolveWorkflowActionPlanMedia(
  plan: WorkflowActionPlan,
  context: WorkflowRuntimeContextForPrompt,
) {
  if (context === null) return [];

  const requestedNodeIds = new Set(
    plan.mediaNodeIdsToSend.map((nodeId) => nodeId.trim()).filter(Boolean),
  );

  const mediaItems = context.nodes
    .filter((node) => isMediaNodeWithAssets(node))
    .filter((node) => requestedNodeIds.has(node.nodeId.toString()))
    .flatMap((node): ManifestMediaItem[] =>
      node.mediaAssets.map((asset) => ({
        nodeId: node.nodeId.toString(),
        url: asset.url,
        mediaType: asset.mediaType,
      })),
    );

  return dedupeMediaItems(mediaItems);
}

export async function generateWorkflowActionPlan(
  ctx: ActionCtx,
  configuredAgent: ReturnType<typeof buildAgent>,
  threadId: string,
  args: AiReplyPromptArgs,
  workflowRuntimeContext: WorkflowRuntimeContextForPrompt,
): Promise<WorkflowActionPlan | null> {
  if (!shouldRunWorkflowActionPlanner(workflowRuntimeContext)) return null;

  const result = await configuredAgent.generateObject(
    ctx,
    { threadId },
    {
      ...aiReplyPromptArgs(args),
      system: buildWorkflowActionPlannerSystemPrompt(workflowRuntimeContext),
      schema: workflowActionPlanSchema,
    },
    { storageOptions: { saveMessages: "none" } },
  );
  return result.object;
}

function getMediaNodesWithAssets(context: WorkflowRuntimeContextForPrompt) {
  if (context === null) return [];
  return context.nodes.filter((node) => isMediaNodeWithAssets(node));
}

function isMediaNodeWithAssets(node: WorkflowNode) {
  return MEDIA_NODE_KINDS.has(node.kind) && node.mediaAssets.length > 0;
}
