import type { Id } from "../_generated/dataModel";

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
  console.log("agent_model_request", { ...context, request: args.request });
  console.log("agent_model_response", { ...context, response: args.response });
}
