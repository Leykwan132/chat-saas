import { expect, test, vi } from "vitest";
import { ensureCommentSubscription } from "./commentAutomationMeta";

test("relies on dashboard subscriptions for Instagram Login accounts", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  await ensureCommentSubscription({
    service: "instagram",
    status: "connected",
    igUserId: "ig-user-1",
    accessToken: "ig-token",
  });

  expect(fetchMock).not.toHaveBeenCalled();
});
