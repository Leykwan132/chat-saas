import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const sourcePath = fileURLToPath(new URL("./threads.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");

test("availability tool logs its agent invocation before checking slots", () => {
  expect(source).toContain('"agent_tool_check_availability_invoked"');
  expect(source).toContain("sourceAgentMessageId");
});
