import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const sourcePath = fileURLToPath(new URL("./CreateAgentPage.tsx", import.meta.url));
const source = readFileSync(sourcePath, "utf8");

test("Create Agent preselects the shared default model", () => {
  expect(source).toContain(
    "import { DEFAULT_AGENT_MODEL } from '../../shared/agentModelDefaults';",
  );
  expect(source.match(/m\.value === DEFAULT_AGENT_MODEL/g)).toHaveLength(2);
  expect(source).not.toContain("const RECOMMENDED_MODEL");
});
