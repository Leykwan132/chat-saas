import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const sourcePath = fileURLToPath(new URL("./streaming.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");

test("playground replies use the agent's normal tool selection", () => {
  expect(source).not.toContain("availabilityToolCallRequirement");
  expect(source).not.toContain("toolChoice");
});
