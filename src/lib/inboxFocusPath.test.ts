import { expect, test } from "vitest";
import { inboxFocusPath, validInboxFocusReturnPath } from "./inboxFocusPath";

test("builds a shareable focused Inbox path", () => {
  expect(inboxFocusPath("agent123")).toBe("/dashboard/agent123/inbox/focus");
});
test("only accepts local focused Inbox destinations", () => {
  expect(
    validInboxFocusReturnPath(
      "/dashboard/agent123/inbox/focus?conversation=chat123",
    ),
  ).toBe("/dashboard/agent123/inbox/focus?conversation=chat123");
  for (const path of [
    null,
    "https://evil.example/dashboard/a/inbox/focus",
    "//evil.example",
    "/workspace",
    "/dashboard/../inbox/focus",
    "/dashboard/a/settings",
    "/dashboard/a%2fb/inbox/focus",
  ]) {
    expect(validInboxFocusReturnPath(path)).toBeNull();
  }
});
