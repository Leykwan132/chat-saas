import { describe, expect, it } from "vitest";
import { createKilobotMcpServer } from "./server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

describe("Kilobot MCP protocol", () => {
  it("advertises read-only tools without calling the backend", async () => {
    let calls = 0;
    const server = createKilobotMcpServer(async () => {
      calls++;
      throw new Error("Unexpected data access");
    });
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    await server.connect(transport);
    const response = await transport.handleRequest(
      new Request("https://mcp.example/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        }),
      }),
    );
    const result = await response.json();
    expect(
      result.result.tools.map((tool: { name: string }) => tool.name),
    ).toEqual([
      "get_connection_context",
      "search_conversations",
      "get_conversation",
      "get_agent_snapshot",
    ]);
    expect(
      result.result.tools.every(
        (tool: { annotations: { readOnlyHint: boolean } }) =>
          tool.annotations.readOnlyHint,
      ),
    ).toBe(true);
    expect(calls).toBe(0);
    await server.close();
  });
});
