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

test("AI reply worker persists delivered media before text messages", () => {
  const worker = inboxSource.slice(
    inboxSource.indexOf("internal.chat.inboxActions.internalSendAiReplyMessages"),
    inboxSource.indexOf("export const internalGetSendContext"),
  );

  expect(worker).toContain("sendResult.mediaSent && allMediaUrls.length > 0");
  expect(worker.indexOf("internalPersistAiMediaReply")).toBeLessThan(
    worker.indexOf("internalPersistAiReplyMessages"),
  );
});
