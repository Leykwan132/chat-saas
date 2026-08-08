import { z } from "zod/v3";
import type { ActionCtx } from "../_generated/server";
import { openRouterModel } from "../llm/openRouter";
import type { buildAgent } from "./threads";
import type { WorkflowRuntimeContextForPrompt } from "./workflowPrompt";
import {
  getMatchedWorkflowActionNodes,
  getPlannableWorkflowActionNodes,
  reconcileWorkflowActionPlan,
} from "./workflowActionExecution";

export {
  resolveWorkflowActionPlanMedia,
  resolveWorkflowActionPlanText,
  shouldRunWorkflowActionPlanner,
} from "./workflowActionExecution";

export const WORKFLOW_ACTION_PLANNER_MODEL = "xiaomi/mimo-v2.5";

export const workflowActionPlanSchema = z.object({
  workflowMatches: z.array(
    z.object({
      matched: z.literal(true).describe("Always true for every workflow node included in this plan."),
      nodeId: z.string().describe("The exact Workflow Runtime node ID copied from the matching action node."),
      nodeKind: z.string().describe("The matching Workflow Runtime node kind, such as sendText, sendImage, or sendFile."),
      nodeTitle: z.string().describe("The matching Workflow Runtime node title copied exactly from the workflow."),
    }).describe("A workflow action node whose configured action will execute this turn."),
  ).describe("Every workflow action node whose condition or customer intent matches this turn."),
  mediaNodeIdsToSend: z.array(
    z.string().describe("A Workflow Runtime media node ID whose uploaded assets should be sent now."),
  ).describe("Node IDs for workflow media nodes whose assets the backend must send now."),
  responseLanguage: z.string().describe(
    "Common English name of the language used in the latest user message, such as Chinese, English, or Malay.",
  ),
  responseGuidance: z.string().describe(
    "A short instruction for the later customer-visible reply, without URLs, uploaded filenames, or internal metadata.",
  ),
});

export type WorkflowActionPlan = z.infer<typeof workflowActionPlanSchema>;

export type AiReplyPromptArgs = {
  promptContent?: string;
  promptMessageId?: string;
};

export function aiReplyPromptArgs(args: AiReplyPromptArgs) {
  if (args.promptMessageId) return { promptMessageId: args.promptMessageId };
  if (args.promptContent) return { prompt: args.promptContent };
  throw new Error("Either promptMessageId or promptContent must be provided");
}

export function hasWorkflowActionMatches(plan: WorkflowActionPlan) {
  return plan.workflowMatches.length > 0;
}

export function workflowActionPlanReplyPromptArgs(
  args: AiReplyPromptArgs,
  plan: WorkflowActionPlan,
  context: WorkflowRuntimeContextForPrompt = null,
) {
  return {
    ...aiReplyPromptArgs(args),
    messages: [
      {
        role: "system" as const,
        content: buildWorkflowActionPlanReplyGuidance(plan, context),
      },
    ],
  };
}

export function buildWorkflowActionPlanReplyGuidance(
  plan: WorkflowActionPlan,
  context: WorkflowRuntimeContextForPrompt = null,
) {
  const matchedMediaNodes = getMatchedWorkflowActionNodes(plan, context)
    .filter((node) => node.kind === "sendImage" || node.kind === "sendFile");
  const languageLine = `- You must respond in ${plan.responseLanguage.trim()} strictly.`;

  if (matchedMediaNodes.length === 0) {
    return [
      "Workflow action plan for this reply:",
      `- Planner guidance: ${plan.responseGuidance}`,
      languageLine,
      "- No workflow media is being sent in this turn.",
      "- Do not claim that an image, video, file, brochure, or attachment is attached or sent unless it is selected to send.",
    ].join("\n");
  }

  const selectedList = matchedMediaNodes.map(
    (node) =>
      `  - ${node.title} (${node.mediaAssets.map((asset) => asset.mediaType).join(", ")})`,
  );

  return [
    "Workflow action plan for this reply:",
    `- Planner guidance: ${plan.responseGuidance}`,
    languageLine,
    "- The backend is sending the selected workflow media now.",
    "- These exact assets are being sent automatically:",
    ...selectedList,
    "- This is important: write the customer-visible response as an action already happening.",
    "- Never mention uploaded filenames in customer-visible content, including parenthetical status text, markdown, captions, or attachment descriptions.",
    "- Do not ask whether the customer wants you to send it.",
    '- Do not say "I can send it", "Would you like me to send it", or "Let me know if you want me to send it" for selected media.',
  ].join("\n");
}

const PLANNER_LANGUAGE_RULES = `Rules:
- Detect the language of the latest user message and set responseLanguage to that language. If the message mixes languages, use the dominant language. Never default to English unless the user wrote in English.
- responseGuidance must never include uploaded filenames or instruct the later reply to display them.`;

const PLANNER_OUTPUT_EXAMPLES = `Example outputs (follow this exact JSON object shape; do not wrap in markdown):

Example 1 — one matching media action:
{
  "workflowMatches": [
    {
      "matched": true,
      "nodeId": "jn7abc123",
      "nodeKind": "sendImage",
      "nodeTitle": "Send Type B video"
    }
  ],
  "mediaNodeIdsToSend": ["jn7abc123"],
  "responseLanguage": "English",
  "responseGuidance": "Tell the customer the Type B video is being sent now."
}

Example 2 — no matching workflow actions:
{
  "workflowMatches": [],
  "mediaNodeIdsToSend": [],
  "responseLanguage": "Malay",
  "responseGuidance": "Answer the customer's question normally without claiming any attachment was sent."
}`;

export function buildWorkflowActionPlannerSystemPrompt(
  context: WorkflowRuntimeContextForPrompt,
) {
  const actionNodes = getPlannableWorkflowActionNodes(context);
  if (actionNodes.length === 0) {
    return `You are a structured reply planner.
Analyze the current conversation and latest customer message.

Return a strict object matching the schema:
- workflowMatches: always [].
- mediaNodeIdsToSend: always [].
- responseLanguage: common English name of the language used in the latest user message (e.g. Chinese, English, Malay).
- responseGuidance: one short instruction for the later customer-visible reply.

${PLANNER_LANGUAGE_RULES}
- There are no Workflow Runtime actions available this turn. Always return empty workflowMatches and mediaNodeIdsToSend.

${PLANNER_OUTPUT_EXAMPLES}`;
  }

  const nodeSections = actionNodes.map((node, index) => {
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
    const actionPayload = node.kind === "sendText"
      ? ["- Exact text that will be sent exactly as configured:", node.textToSend!]
      : [
          "- Media assets that will be sent automatically:",
          ...node.mediaAssets.map((asset) => {
            const filename = asset.filename ? `, filename: ${asset.filename}` : "";
            return `  - clientId: ${asset.clientId}${filename}, type: ${asset.mediaType}`;
          }),
        ];

    return [
      `### ${index + 1}. ${node.title}`,
      `- Node ID: ${node.nodeId}`,
      `- Kind: ${node.kind}`,
      incoming,
      ...actionPayload,
    ].join("\n");
  }).join("\n\n");

  return `You are a structured workflow action planner.
Analyze the current conversation and latest customer message. Decide which listed Workflow Runtime actions match this turn.

Return a strict object matching the schema:
- workflowMatches: every workflow action whose condition/customer intent matches this turn. Every listed match will execute.
- mediaNodeIdsToSend: every matched sendImage/sendFile node ID. The backend validates and reconciles this field from workflowMatches.
- responseLanguage: common English name of the language used in the latest user message (e.g. Chinese, English, Malay).
- responseGuidance: one short instruction for the later customer-visible reply.

${PLANNER_LANGUAGE_RULES}
- Do not return media URLs. The backend resolves URLs from node IDs.
- Use only exact Node IDs listed below.
- Include an action in workflowMatches only when it should execute now.
- Every matched sendImage/sendFile asset will be sent automatically, for sure. Never ask whether the customer wants it sent.
- Every matched sendText message will be sent exactly as configured. Do not paraphrase or add to it.
- If a customer asks again for a matching photo, video, brochure, PDF, document, file, catalog, menu, or attachment, match that media node again.
- Use an empty workflowMatches array only when none of the listed actions match.
- Copy exact nodeId, nodeKind, and nodeTitle values from the listed nodes below into workflowMatches.

${PLANNER_OUTPUT_EXAMPLES}

Workflow action nodes and definitive payloads:
${nodeSections}`;
}

export async function generateWorkflowActionPlan(
  ctx: ActionCtx,
  configuredAgent: ReturnType<typeof buildAgent>,
  threadId: string,
  args: AiReplyPromptArgs,
  workflowRuntimeContext: WorkflowRuntimeContextForPrompt,
): Promise<WorkflowActionPlan> {
  const result = await configuredAgent.generateObject(
    ctx,
    { threadId },
    {
      ...aiReplyPromptArgs(args),
      model: openRouterModel(WORKFLOW_ACTION_PLANNER_MODEL),
      system: buildWorkflowActionPlannerSystemPrompt(workflowRuntimeContext),
      schema: workflowActionPlanSchema,
    },
    { storageOptions: { saveMessages: "none" } },
  );

  const reconciledPlan = reconcileWorkflowActionPlan(
    result.object,
    workflowRuntimeContext,
  );
  console.log("Workflow action plan result:", reconciledPlan);
  return reconciledPlan;
}
