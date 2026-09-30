import { expect, test, vi } from "vitest";
import threadsSource from "./threads.ts?raw";
import inboxSource from "./inbox.ts?raw";
import { logAgentRequestResponse } from "./agentRequestResponseLogging";
import type { Id } from "../_generated/dataModel";

const helpers = import.meta.glob("./agentRequestResponseLogging.ts", {
  eager: true,
  import: "default",
  query: "?raw",
});

test("logs each raw agent request and response", () => {
  expect(Object.keys(helpers)).toEqual(["./agentRequestResponseLogging.ts"]);
  expect(threadsSource).toContain("rawRequestResponseHandler:");
  const source = Object.values(helpers)[0] as string;
  expect(source).toContain('console.log("agent_model_request"');
  expect(source).toContain('console.log("agent_model_response"');
  expect(source).toContain('console.log("agent_model_tool_calls"');
  expect(inboxSource).not.toContain("[inbox] ai reply worker generated reply");
  expect(inboxSource).not.toContain("[inbox] ai reply worker channel send resolved");
  expect(inboxSource).not.toContain("[inbox] ai reply worker persisting sent messages");
});

test("logs each called tool with its arguments", () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  try {
    logAgentRequestResponse({
      agentId: "agent-id" as Id<"agents">,
      conversationId: "conversation-id" as Id<"conversations">,
      request: {
        messages: [{
          role: "assistant",
          content: [{
            type: "tool-call",
            toolName: "cancelBooking",
            toolCallId: "tool-call-id",
            input: { bookingId: "booking-id" },
          }],
        }],
      },
      response: {},
    });

    expect(log).toHaveBeenCalledWith(
      "agent_model_tool_calls",
      JSON.stringify({
        agentId: "agent-id",
        conversationId: "conversation-id",
        toolCalls: [{
          toolName: "cancelBooking",
          toolCallId: "tool-call-id",
          input: { bookingId: "booking-id" },
        }],
      }),
    );
  } finally {
    log.mockRestore();
  }
});
