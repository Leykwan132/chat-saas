import type { Id } from "../_generated/dataModel";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as UnknownRecord;
}

function toolCallsFromRequest(request: unknown) {
  const messages = asRecord(request)?.messages;
  if (!Array.isArray(messages)) return [];

  return messages.flatMap((message) => {
    const assistantMessage = asRecord(message);
    if (assistantMessage?.role !== "assistant" || !Array.isArray(assistantMessage.content)) {
      return [];
    }
    return assistantMessage.content.flatMap((content) => {
      const toolCall = asRecord(content);
      if (toolCall?.type !== "tool-call" || typeof toolCall.toolName !== "string") {
        return [];
      }
      return [{
        toolName: toolCall.toolName,
        ...(typeof toolCall.toolCallId === "string" ? { toolCallId: toolCall.toolCallId } : {}),
        ...(toolCall.input !== undefined ? { input: toolCall.input } : {}),
      }];
    });
  });
}

export function logAgentRequestResponse(args: {
  agentId: Id<"agents">;
  agentName?: string;
  conversationId?: Id<"conversations">;
  sourceAgentMessageId?: string;
  request: unknown;
  response: unknown;
}) {
  const context = {
    agentId: args.agentId,
    agentName: args.agentName,
    conversationId: args.conversationId,
    sourceAgentMessageId: args.sourceAgentMessageId,
  };
  console.log("agent_model_request", JSON.stringify({ ...context, request: args.request }));
  console.log("agent_model_response", JSON.stringify({ ...context, response: args.response }));
  const toolCalls = toolCallsFromRequest(args.request);
  if (toolCalls.length > 0) {
    console.log("agent_model_tool_calls", JSON.stringify({ ...context, toolCalls }));
  }
}
