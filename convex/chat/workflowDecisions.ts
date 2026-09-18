import { listMessages } from "@convex-dev/agent";
import { z } from "zod/v3";
import { components } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { WorkflowRuntimeContextForPrompt } from "./workflowPrompt";

export const WORKFLOW_DECISION_MODEL = "typesafe/jev-1.13";
export const WORKFLOW_DECISION_THRESHOLD = 0.8;

type WorkflowDecisionAnswer = { noul: number };

type WorkflowDecisionAnswers = Record<string, WorkflowDecisionAnswer>;

const workflowDecisionResponseSchema = z.object({
  answers: z.record(z.object({ noul: z.number().min(0).max(1) })),
});

export function getWorkflowDecisionNodes(context: WorkflowRuntimeContextForPrompt) {
  if (context === null) return [];
  return context.nodes.filter((node) => node.kind !== "start");
}

function workflowDecisionKeyBase(title: string, kind: string) {
  const words = title.normalize("NFKD").match(/[A-Za-z0-9]+/g);
  const value = words?.map((word, index) => (
    index === 0
      ? word.toLowerCase()
      : `${word[0]!.toUpperCase()}${word.slice(1).toLowerCase()}`
  )).join("");
  return value || kind;
}

function getWorkflowDecisionQuestionEntries(context: WorkflowRuntimeContextForPrompt) {
  const counts = new Map<string, number>();
  return getWorkflowDecisionNodes(context).map((node) => {
    const baseKey = workflowDecisionKeyBase(node.title, node.kind);
    const count = (counts.get(baseKey) ?? 0) + 1;
    counts.set(baseKey, count);
    return {
      key: count === 1 ? baseKey : `${baseKey}${count}`,
      node,
    };
  });
}

function buildWorkflowNodeDecisionInstructions(
  node: ReturnType<typeof getWorkflowDecisionNodes>[number],
) {
  const incomingConditions = node.incomingConditions.length === 0
    ? "Incoming conditions: message enters here."
    : `Incoming conditions: ${node.incomingConditions.map((condition) => [condition.name, condition.detail].filter(Boolean).join(" — ")).join("; ")}.`;
  const goal = node.goal ? `Goal: ${node.goal}.` : "";
  const textToSend = node.textToSend ? `Configured message: ${node.textToSend}.` : "";
  const services = node.allowedServices.length === 0
    ? ""
    : `Available services: ${node.allowedServices.map((service) => `${service.name} (${service.durationMinutes} minutes)`).join(", ")}.`;
  const media = node.mediaAssets.length === 0
    ? ""
    : `Available media: ${node.mediaAssets.map((asset) => `${asset.filename ?? asset.clientId} (${asset.mediaType})`).join(", ")}.`;
  return [
    `How directly does the current conversation require the workflow node \"${node.title}\" (${node.kind})?`,
    incomingConditions,
    goal,
    textToSend,
    services,
    media,
  ].filter(Boolean).join(" ");
}

function buildWorkflowNodeDecisionCriteria(
  node: ReturnType<typeof getWorkflowDecisionNodes>[number],
) {
  return {
    true: `The current conversation matches the incoming conditions or intent for the ${node.title} node, so it should run now.`,
    false: `The current conversation does not match the incoming conditions or intent for the ${node.title} node, so it should not run now.`,
  };
}

export function buildWorkflowDecisionRequest(
  state: string,
  context: WorkflowRuntimeContextForPrompt,
) {
  const decisionQuestions = getWorkflowDecisionQuestionEntries(context);
  return {
    model: WORKFLOW_DECISION_MODEL,
    state,
    questions: Object.fromEntries(decisionQuestions.map(({ key, node }) => [
      key,
      {
        type: "noul" as const,
        instructions: buildWorkflowNodeDecisionInstructions(node),
        criteria: buildWorkflowNodeDecisionCriteria(node),
      },
    ])),
  };
}

export function reconcileWorkflowDecisionAnswers(
  answers: WorkflowDecisionAnswers,
  context: WorkflowRuntimeContextForPrompt,
) {
  const decisions = getWorkflowDecisionQuestionEntries(context).map(({ key, node }) => {
    const noul = answers[key]?.noul;
    if (noul === undefined) {
      throw new Error(`Workflow decision response omitted ${key}`);
    }
    return {
      nodeId: node.nodeId,
      noul,
      matched: false,
    };
  });
  const selectedNodeIds = decisions
    .filter((decision) => decision.noul >= WORKFLOW_DECISION_THRESHOLD)
    .map((decision) => decision.nodeId);
  return {
    selectedNodeIds,
    decisions: decisions.map((decision) => ({
      ...decision,
      matched: selectedNodeIds.includes(decision.nodeId),
    })),
  };
}

export async function buildWorkflowDecisionState(
  ctx: ActionCtx,
  threadId: string,
  promptContent?: string,
) {
  const messages = await listMessages(ctx, components.agent, {
    threadId,
    paginationOpts: { numItems: 20, cursor: null },
    excludeToolMessages: true,
  });
  const history = messages.page.reverse().flatMap((message) => {
    const role = message.message?.role;
    const text = message.text?.trim();
    if ((role !== "user" && role !== "assistant") || !text) return [];
    return [`${role === "user" ? "Customer" : "Assistant"}: ${text}`];
  });
  if (promptContent?.trim()) history.push(`Customer: ${promptContent.trim()}`);
  if (history.length === 0) throw new Error("Workflow decision state has no conversation messages");
  return history.join("\n");
}

export async function requestWorkflowDecisionAnswers(request: ReturnType<typeof buildWorkflowDecisionRequest>) {
  const apiKey = process.env.OPEN_ROUTER_API?.trim();
  if (!apiKey) throw new Error("OPEN_ROUTER_API is not configured");
  const startedAt = Date.now();
  const response = await fetch("https://openrouter.ai/api/alpha/decisions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`OpenRouter workflow decision failed: HTTP ${response.status}`);
  }
  const answers = workflowDecisionResponseSchema.parse(payload).answers;
  return {
    answers,
    latencyMs: Date.now() - startedAt,
  };
}
