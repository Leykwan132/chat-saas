import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureCommentSubscription } from "./commentAutomationMeta";

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
});
