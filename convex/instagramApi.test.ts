import { describe, expect, it } from "vitest";
import {
  instagramConversationsUrl,
  instagramMessagingUrl,
  instagramObjectBase,
} from "./instagramApi";

describe("Instagram API routing", () => {
  it("keeps Instagram Login channels on graph.instagram.com", () => {
    expect(instagramMessagingUrl({})).toContain(
      "graph.instagram.com/v25.0/me/messages",
    );
    expect(instagramConversationsUrl({})).toContain(
      "graph.instagram.com/v25.0/me/conversations",
    );
  });

  it("routes Embedded Signup channels through their Facebook Page", () => {
    const channel = { instagramPageId: "page-1" };
    expect(instagramMessagingUrl(channel)).toContain(
      "graph.facebook.com/v25.0/page-1/messages",
    );
    expect(instagramConversationsUrl(channel)).toContain(
      "graph.facebook.com/v25.0/page-1/conversations",
    );
    expect(instagramObjectBase(channel)).toContain(
      "graph.facebook.com/v25.0",
    );
  });
});
