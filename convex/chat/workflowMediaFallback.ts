import type { WorkflowRuntimeContextForPrompt } from "./workflowPrompt";

const MEDIA_NODE_KINDS = new Set(["sendImage", "sendFile"]);

type WorkflowMediaNode = NonNullable<WorkflowRuntimeContextForPrompt>["nodes"][number];

function normalizeLabel(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,10}$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSpecificLabel(label: string) {
  return label.length >= 6 && label.split(" ").length >= 2;
}

function filenameStem(filename: string | undefined) {
  if (!filename) return undefined;
  return filename.replace(/\.[^.]+$/, "");
}

function nodeLabels(node: WorkflowMediaNode) {
  return [
    node.title,
    node.goal,
    node.notes,
    ...node.incomingConditions.flatMap((condition) => [
      condition.name,
      condition.detail,
    ]),
  ];
}

function labelVariants(label: string | undefined) {
  if (!label) return [];
  return [
    label,
    label.replace(/^(send|show|share|provide|attach|display)\s+/i, ""),
  ];
}

function replyMentionsLabel(reply: string, label: string | undefined) {
  if (!label) return false;
  const normalized = normalizeLabel(label);
  return isSpecificLabel(normalized) && reply.includes(normalized);
}

export function inferWorkflowMediaClientIdsFromReply(
  replyText: string,
  context: WorkflowRuntimeContextForPrompt,
) {
  if (context === null) return [] as string[];

  const normalizedReply = normalizeLabel(replyText);
  const clientIds: string[] = [];
  const seen = new Set<string>();

  for (const node of context.nodes) {
    if (!MEDIA_NODE_KINDS.has(node.kind)) continue;
    for (const asset of node.mediaAssets) {
      const labels = [
        asset.filename,
        filenameStem(asset.filename),
        ...nodeLabels(node),
      ].flatMap(labelVariants);
      if (!labels.some((label) => replyMentionsLabel(normalizedReply, label))) {
        continue;
      }
      if (seen.has(asset.clientId)) continue;
      seen.add(asset.clientId);
      clientIds.push(asset.clientId);
    }
  }

  return clientIds;
}
