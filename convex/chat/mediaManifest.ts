import type { WorkflowRuntimeContextForPrompt } from "./workflowPrompt";

type ManifestItem = string | {
  nodeId?: unknown;
  url?: unknown;
  type?: unknown;
  mediaType?: unknown;
};

type WorkflowMatchItem = string | {
  matched?: unknown;
  nodeId?: unknown;
  nodeKind?: unknown;
  nodeTitle?: unknown;
};

export type ManifestMediaItem = {
  nodeId: string;
  url: string;
  mediaType: string;
};

export type ManifestWorkflowMatch = {
  matched: true;
  nodeId: string;
  nodeKind: string;
  nodeTitle: string;
};

type RuntimeWorkflowNode = NonNullable<WorkflowRuntimeContextForPrompt>["nodes"][number];

const CUSTOMER_RESPONSE_RE = /<customer_response>\s*([\s\S]*?)\s*<\/customer_response>/i;
const MEDIA_TO_SEND_RE = /<media_to_send>\s*([\s\S]*?)\s*<\/media_to_send>/i;
const MEDIA_TO_SEND_GLOBAL_RE = /<media_to_send>\s*[\s\S]*?\s*<\/media_to_send>/gi;
const WORKFLOW_MATCHES_RE = /<workflow_matches>\s*([\s\S]*?)\s*<\/workflow_matches>/i;
const WORKFLOW_MATCHES_GLOBAL_RE = /<workflow_matches>\s*[\s\S]*?\s*<\/workflow_matches>/gi;
const MEDIA_NODE_KINDS = new Set(["sendImage", "sendFile"]);

function normalizeText(text: string) {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function uniqueMediaItems(items: ManifestMediaItem[]) {
  const seen = new Set<string>();
  const result: ManifestMediaItem[] = [];
  for (const rawItem of items) {
    const nodeId = rawItem.nodeId.trim();
    const url = rawItem.url.trim();
    const mediaType = rawItem.mediaType.trim();
    const key = `${nodeId}\n${url}`;
    if (!nodeId || !url || !mediaType || seen.has(key)) continue;
    seen.add(key);
    result.push({ nodeId, url, mediaType });
  }
  return result;
}

function normalizeManifestJson(rawManifest: string) {
  const trimmed = rawManifest.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function parseJsonArray(rawJson: string | undefined) {
  if (rawJson === undefined) return [];

  try {
    const parsed: unknown = JSON.parse(normalizeManifestJson(rawJson));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseWorkflowMatches(rawManifest: string | undefined) {
  return parseJsonArray(rawManifest).flatMap((item: WorkflowMatchItem) => {
    if (
      item !== null &&
      typeof item === "object" &&
      item.matched === true &&
      typeof item.nodeId === "string" &&
      typeof item.nodeKind === "string" &&
      typeof item.nodeTitle === "string"
    ) {
      return [{
        matched: true,
        nodeId: item.nodeId,
        nodeKind: item.nodeKind,
        nodeTitle: item.nodeTitle,
      } satisfies ManifestWorkflowMatch];
    }
    return [];
  });
}

function parseManifestItems(rawManifest: string | undefined) {
  if (rawManifest === undefined) return [];

  return uniqueMediaItems(
    parseJsonArray(rawManifest).flatMap((item: ManifestItem) => {
      if (
        item !== null &&
        typeof item === "object" &&
        typeof item.nodeId === "string" &&
        typeof item.url === "string"
      ) {
        const mediaType = typeof item.type === "string"
          ? item.type
          : typeof item.mediaType === "string"
            ? item.mediaType
            : "";
        return [{ nodeId: item.nodeId, url: item.url, mediaType }];
      }
      return [];
    }),
  );
}

export function extractMediaManifest(text: string) {
  const workflowMatches = text.match(WORKFLOW_MATCHES_RE)?.[1];
  const customerResponse = text.match(CUSTOMER_RESPONSE_RE)?.[1];
  const mediaManifest = text.match(MEDIA_TO_SEND_RE)?.[1];
  const visibleText = customerResponse ?? text
    .replace(WORKFLOW_MATCHES_GLOBAL_RE, "")
    .replace(MEDIA_TO_SEND_GLOBAL_RE, "");

  return {
    text: normalizeText(visibleText),
    mediaItems: parseManifestItems(mediaManifest),
    workflowMatches: parseWorkflowMatches(workflowMatches),
  };
}

export function filterWorkflowMediaManifestItems(
  items: ManifestMediaItem[],
  context: WorkflowRuntimeContextForPrompt,
  workflowMatches: ManifestWorkflowMatch[],
) {
  if (context === null) return [];

  const mediaNodesById = new Map<string, RuntimeWorkflowNode>(
    context.nodes
      .filter((node) => MEDIA_NODE_KINDS.has(node.kind))
      .map((node) => [node.nodeId.toString(), node] as const),
  );

  const matchedMediaNodes = uniqueWorkflowNodeIds(workflowMatches)
    .flatMap((nodeId) => {
      const node = mediaNodesById.get(nodeId);
      return node ? [node] : [];
    });

  const matchedMediaNodeIds = new Set(matchedMediaNodes.map((node) => node.nodeId.toString()));
  const allowedMediaByNodeAndUrl = new Map(
    matchedMediaNodes.flatMap((node) =>
      node.mediaAssets.map((asset) => [
        mediaKey(node.nodeId.toString(), asset.url),
        { nodeId: node.nodeId.toString(), url: asset.url, mediaType: asset.mediaType },
      ] as const)
    ),
  );

  const declaredMediaItems = uniqueMediaItems(items)
    .filter((item) => matchedMediaNodeIds.has(item.nodeId))
    .map((item) => allowedMediaByNodeAndUrl.get(mediaKey(item.nodeId, item.url)))
    .filter((item): item is ManifestMediaItem => item !== undefined);
  const requiredMediaItems = matchedMediaNodes.flatMap((node) =>
    node.mediaAssets.map((asset) => ({
      nodeId: node.nodeId.toString(),
      url: asset.url,
      mediaType: asset.mediaType,
    })),
  );

  return uniqueMediaItems([...declaredMediaItems, ...requiredMediaItems]);
}

function uniqueWorkflowNodeIds(workflowMatches: ManifestWorkflowMatch[]) {
  const seen = new Set<string>();
  const nodeIds: string[] = [];
  for (const match of workflowMatches) {
    const nodeId = match.nodeId.trim();
    if (!nodeId || seen.has(nodeId)) continue;
    seen.add(nodeId);
    nodeIds.push(nodeId);
  }
  return nodeIds;
}

function mediaKey(nodeId: string, url: string) {
  return `${nodeId}\n${url}`;
}
