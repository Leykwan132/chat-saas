import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const streamingSourcePath = fileURLToPath(new URL("./streaming.ts", import.meta.url));
const threadsSourcePath = fileURLToPath(new URL("./threads.ts", import.meta.url));
const streamingSource = readFileSync(streamingSourcePath, "utf8");
const threadsSource = readFileSync(threadsSourcePath, "utf8");

test("playground exposes customer Q&A, context, and availability tools while testing", () => {
  expect(threadsSource).toContain("playgroundAvailabilityOnly");
  expect(threadsSource).toContain('toolName !== "fetchCustomerQa" && toolName !== "fetchContext" && toolName !== "checkAvailability"');
  expect(streamingSource).toContain("args.promptMessageId,\n      true");
});
