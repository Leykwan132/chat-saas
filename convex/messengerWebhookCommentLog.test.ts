import { describe, expect, it } from "vitest";
import { messengerCommentOutboundLog } from "./messengerWebhookCommentLog";

describe("messengerCommentOutboundLog", () => {
  it("marks public reply and private message as not sent for a page comment", () => {
    expect(
      messengerCommentOutboundLog({
        field: "feed",
        value: {
          item: "comment",
          verb: "add",
          comment_id: "comment-1",
          post_id: "post-1",
          from: { id: "user-1", name: "Alex" },
          message: "Price?",
        },
      }),
    ).toEqual({
      field: "feed",
      item: "comment",
      verb: "add",
      commentId: "comment-1",
      postId: "post-1",
      parentId: undefined,
      message: "Price?",
      from: { id: "user-1", name: "Alex" },
      publicReply: "not-sent",
      privateMessage: "not-sent",
    });
  });

  it("ignores non-comment feed changes", () => {
    expect(
      messengerCommentOutboundLog({
        field: "feed",
        value: { item: "post", verb: "add" },
      }),
    ).toBeUndefined();
  });
});
