export type ToolMediaItem = {
  url: string;
  mediaType: string;
  filename?: string;
};

type ToolResultLike = {
  toolName?: unknown;
  output?: unknown;
  result?: unknown;
};

type UnknownRecord = Record<string, unknown>;

export function extractSendMediaItemsFromResult(result: unknown): ToolMediaItem[] {
  return dedupeMediaItems(
    collectSendMediaOutputs(result).flatMap(extractItemsFromToolOutput),
  );
}

function collectSendMediaOutputs(result: unknown): unknown[] {
  const outputs: unknown[] = [];
  const root = asRecord(result);
  if (root === null) return outputs;

  collectToolOutputs(root.toolResults, outputs);
  collectToolOutputs(root.staticToolResults, outputs);
  collectToolOutputs(root.dynamicToolResults, outputs);

  for (const step of asArray(root.steps)) {
    const stepRecord = asRecord(step);
    if (stepRecord === null) continue;
    collectToolOutputs(stepRecord.toolResults, outputs);
    collectToolOutputs(stepRecord.staticToolResults, outputs);
    collectToolOutputs(stepRecord.dynamicToolResults, outputs);
    collectContentOutputs(stepRecord.content, outputs);
  }

  collectContentOutputs(root.content, outputs);

  const response = asRecord(root.response);
  for (const message of asArray(response?.messages)) {
    const messageRecord = asRecord(message);
    collectContentOutputs(messageRecord?.content, outputs);
  }

  return outputs;
}

function collectToolOutputs(toolResults: unknown, outputs: unknown[]) {
  for (const toolResult of asArray(toolResults)) {
    const maybeResult = asRecord(toolResult) as ToolResultLike | null;
    if (maybeResult?.toolName !== "sendMedia") continue;
    outputs.push(resolveToolOutput(maybeResult));
  }
}

function collectContentOutputs(content: unknown, outputs: unknown[]) {
  for (const part of asArray(content)) {
    const maybeResult = asRecord(part) as ToolResultLike & { type?: unknown } | null;
    if (maybeResult?.type !== "tool-result" || maybeResult.toolName !== "sendMedia") continue;
    outputs.push(resolveToolOutput(maybeResult));
  }
}

function resolveToolOutput(toolResult: ToolResultLike) {
  return unwrapToolOutput("output" in toolResult ? toolResult.output : toolResult.result);
}

function unwrapToolOutput(output: unknown): unknown {
  const record = asRecord(output);
  if (record?.type === "json") return record.value;
  return output;
}

function extractItemsFromToolOutput(output: unknown): ToolMediaItem[] {
  if (!Array.isArray(output)) return [];
  return output.flatMap((item) => {
    const mediaItem = item as {
      publicUrl?: unknown;
      url?: unknown;
      mediaType?: unknown;
      filename?: unknown;
    };
    const url = typeof mediaItem.publicUrl === "string"
      ? mediaItem.publicUrl
      : typeof mediaItem.url === "string"
        ? mediaItem.url
        : "";
    if (!url || typeof mediaItem.mediaType !== "string") return [];
    return [{
      url,
      mediaType: mediaItem.mediaType,
      ...(typeof mediaItem.filename === "string" ? { filename: mediaItem.filename } : {}),
    }];
  });
}

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object"
    ? value as UnknownRecord
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function dedupeMediaItems(items: ToolMediaItem[]) {
  const byUrl = new Map<string, ToolMediaItem>();
  for (const item of items) {
    if (!byUrl.has(item.url)) {
      byUrl.set(item.url, item);
    }
  }
  return [...byUrl.values()];
}
