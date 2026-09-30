import { expect, test } from "vitest";
import threadsSource from "./threads.ts?raw";

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
});
