import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const inboxActionsSource = readFileSync(
  fileURLToPath(new URL("./inboxActions.ts", import.meta.url)),
  "utf8",
);
const inboxSource = readFileSync(
  fileURLToPath(new URL("./inbox.ts", import.meta.url)),
  "utf8",
);

test("multi-message AI replies send media before any text parts", () => {
  const sendFn = inboxActionsSource.slice(
    inboxActionsSource.indexOf("export const internalSendAiReplyMessages"),
    inboxActionsSource.indexOf("export const internalSendEscalationMessage"),
  );

  expect(sendFn).toContain('content: ""');
  expect(sendFn).toContain("mediaSent = true");
  expect(sendFn.indexOf("mediaSent = true")).toBeLessThan(
    sendFn.indexOf("for (const content of contents)"),
  );
});

test("AI reply worker queues text before channel delivery", () => {
  const worker = inboxSource.slice(
    inboxSource.indexOf("const queuedTextReply"),
    inboxSource.indexOf("export const internalGetSendContext"),
  );

  expect(worker.indexOf("internal.chat.inbox.internalPersistAiReplyMessages")).toBeLessThan(
    worker.indexOf("internal.chat.inboxActions.internalSendAiReplyMessages"),
  );
});
