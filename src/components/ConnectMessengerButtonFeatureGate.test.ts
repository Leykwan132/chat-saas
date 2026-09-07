import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("passes the Comment-to-Inbox gate into Messenger signup", () => {
  const source = readFileSync(
    new URL("./ConnectMessengerButton.tsx", import.meta.url),
    "utf8",
  );

  expect(source).toContain("useEnableCommentToInboxFeature");
  expect(source).toContain("isCommentToInboxUserAllowed(user?.email)");
  expect(source).toContain("enableCommentWebhooks");
});
