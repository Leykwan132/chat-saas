import { describe, expect, it } from "vitest";
import { parseMessengerCommentEvent } from "./commentAutomationEvent";

describe("parseMessengerCommentEvent", () => {
  it("normalizes a new Messenger Page comment", () => {
    expect(parseMessengerCommentEvent("page-1", {
      field: "feed",
      value: {
        from: { id: "customer-1", name: "Alex" },
        comment_id: "comment-1",
        created_time: 1_788_758_518,
        item: "comment",
        verb: "add",
      },
    })).toEqual({
      pageId: "page-1",
      externalCommentId: "comment-1",
      authorAddress: "customer-1",
      authorName: "Alex",
      text: undefined,
      timestampMs: 1_788_758_518_000,
    });
  });

  it("ignores Page-authored comments and non-add events", () => {
    expect(parseMessengerCommentEvent("page-1", {
      field: "feed",
      value: {
        from: { id: "page-1" },
        comment_id: "comment-1",
        created_time: 1_788_758_518,
        item: "comment",
        verb: "add",
      },
    })).toBeUndefined();
    expect(parseMessengerCommentEvent("page-1", {
      field: "feed",
      value: {
        from: { id: "customer-1" },
        comment_id: "comment-1",
        created_time: 1_788_758_518,
        item: "comment",
        verb: "remove",
      },
    })).toBeUndefined();
  });
});
