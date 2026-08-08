import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const streamingSource = readFileSync(
  fileURLToPath(new URL("./streaming.ts", import.meta.url)),
  "utf8",
);

test("playground streams the reply and splits it into separate messages", () => {
  expect(streamingSource).toContain("configuredAgent.streamText(");
  expect(streamingSource).toContain("saveStreamDeltas:");
  expect(streamingSource).toContain("splitAiReplyMessages(rawReplyText)");
  expect(streamingSource).toContain("messageId: streamedAssistant._id");
  expect(streamingSource).toContain("saveMessages(ctx, components.agent, {");
});

test("playground charges the generated turn only once", () => {
  expect(streamingSource).toContain(
    "creditsCharged: index === 0 ? usage.creditsCharged : 0",
  );
});
