import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const frameSource = readFileSync(
  new URL("./InboxBroadcastMessage.tsx", import.meta.url),
  "utf8",
);
const threadSource = readFileSync(
  new URL("./InboxThreadMessages.tsx", import.meta.url),
  "utf8",
);

test("broadcast frame contains typed media and a bottom-left label", () => {
  expect(frameSource).toContain("Megaphone");
  expect(frameSource).toContain(">Broadcast<");
  expect(frameSource).toContain('headerFormat === "IMAGE"');
  expect(frameSource).toContain('headerFormat === "VIDEO"');
  expect(frameSource).toContain('headerFormat === "DOCUMENT"');
  expect(frameSource).toContain("items-center gap-1");
  expect(frameSource).toContain("ml-auto max-w-full");
});

test("thread renderer selects the broadcast frame from metadata", () => {
  expect(threadSource).toContain("message.isBroadcast");
  expect(threadSource).toContain("<InboxBroadcastMessage");
  expect(threadSource).toContain("message.broadcastPresentation");
});
