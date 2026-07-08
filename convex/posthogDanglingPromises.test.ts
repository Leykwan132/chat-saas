import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const filesWithAIGenerationCapture = [
  "./analyticsSentiment.ts",
  "./chat/inboxActions.ts",
  "./chat/threads.ts",
];

describe("PostHog AI generation capture", () => {
  test.each(filesWithAIGenerationCapture)(
    "%s awaits capture calls so Convex actions do not leave dangling fetches",
    (relativePath) => {
      const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
      const source = readFileSync(sourcePath, "utf8");

      expect(source).not.toMatch(/\bvoid\s+captureAIGeneration\(/);
    },
  );
});
