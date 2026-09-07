import { describe, expect, it } from "vitest";
import {
  messengerSubscribedFields,
  shouldEnableMessengerCommentWebhooks,
} from "./messengerConnect";

describe("Messenger Page subscriptions", () => {
  it("keeps ordinary connections on messaging fields", () => {
    expect(messengerSubscribedFields(false)).toBe(
      "messages,messaging_postbacks",
    );
  });

  it("adds feed for approved Comment-to-Inbox connections", () => {
    expect(messengerSubscribedFields(true)).toBe(
      "messages,messaging_postbacks,feed",
    );
  });

  it("enforces the Comment-to-Inbox allowlist on the backend", () => {
    expect(shouldEnableMessengerCommentWebhooks(
      true,
      "leykwan132@gmail.com",
    )).toBe(true);
    expect(shouldEnableMessengerCommentWebhooks(
      true,
      "other@example.com",
    )).toBe(false);
    expect(shouldEnableMessengerCommentWebhooks(
      false,
      "leykwan132@gmail.com",
    )).toBe(false);
  });
});
