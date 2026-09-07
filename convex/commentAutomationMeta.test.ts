import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ensureCommentSubscription,
  getMessengerComment,
  sendMessengerCommentPrivateReply,
  sendMessengerCommentPublicReply,
} from "./commentAutomationMeta";

describe("ensureCommentSubscription", () => {
  afterEach(() => vi.restoreAllMocks());

  it("subscribes a Messenger page to messaging and comment events", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await ensureCommentSubscription({
      service: "messenger",
      status: "connected",
      pageId: "page-1",
      accessToken: "page-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/page-1/subscribed_apps"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("subscribed_fields=messages%2Cmessaging_postbacks%2Cfeed"),
      expect.anything(),
    );
  });

  it("associates an Embedded Signup Instagram page through a valid Page field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await ensureCommentSubscription({
      service: "instagram",
      status: "connected",
      instagramPageId: "page-1",
      igUserId: "ig-1",
      accessToken: "page-token",
    });

    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "graph.facebook.com/v25.0/page-1/subscribed_apps",
    );
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "subscribed_fields=feed",
    );
  });

  it("fetches comment text and author details", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "comment-1",
      message: "Pricing please",
      from: { id: "customer-1", name: "Alex" },
      created_time: 1_788_758_518,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getMessengerComment({
      service: "messenger",
      status: "connected",
      pageId: "page-1",
      accessToken: "page-token",
    }, "comment-1")).resolves.toMatchObject({
      message: "Pricing please",
      authorId: "customer-1",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/comment-1?fields=id%2Cmessage%2Cfrom%2Ccreated_time",
    );
  });

  it("sends private and public replies to the source comment", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        recipient_id: "customer-1",
        message_id: "message-1",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "reply-1",
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const channel = {
      service: "messenger",
      status: "connected",
      pageId: "page-1",
      accessToken: "page-token",
    };

    await sendMessengerCommentPrivateReply(channel, "comment-1", "Sent privately");
    await sendMessengerCommentPublicReply(channel, "comment-1", "Check your inbox");

    expect(fetchMock.mock.calls[0]?.[0]).toContain("/page-1/messages");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      recipient: { comment_id: "comment-1" },
      message: { text: "Sent privately" },
    });
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/comment-1/comments");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      message: "Check your inbox",
    });
  });
});
