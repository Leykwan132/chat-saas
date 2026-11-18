import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { useConvexAuth, useQuery } from "convex/react";
import { useLocation } from "react-router";
import { readInboxFocusReturnPath } from "@/lib/inboxFocusPath";
import { InboxFocusReturnGate } from "./InboxFocusReturnGate";

vi.mock("convex/react", () => ({ useConvexAuth: vi.fn(), useQuery: vi.fn() }));
vi.mock("@/lib/inboxFocusPath", () => ({ readInboxFocusReturnPath: vi.fn() }));
vi.mock("react-router", () => ({
  useLocation: vi.fn(),
  Navigate: ({ to }: { to: string }) => <span data-destination={to} />,
}));
const target = "/dashboard/agent123/inbox/focus";
beforeEach(() => {
  vi.mocked(useConvexAuth).mockReturnValue({
    isLoading: false,
    isAuthenticated: true,
    isRefreshing: false,
  });
  vi.mocked(useLocation).mockReturnValue({
    pathname: "/workspace",
  } as ReturnType<typeof useLocation>);
  vi.mocked(readInboxFocusReturnPath).mockReturnValue(target);
  vi.mocked(useQuery).mockReturnValue({
    needsPersonalWorkspace: false,
    plan: "free",
    isPartnerManaged: false,
    onboardingAnswers: { role: "support", useCase: [], channels: [] },
  });
});
function render() {
  return renderToStaticMarkup(
    <InboxFocusReturnGate>
      <div>Current page</div>
    </InboxFocusReturnGate>,
  );
}

test("returns a ready signed-in client to the shared Inbox", () => {
  expect(render()).toContain(target);
});
test("never bypasses required onboarding", () => {
  vi.mocked(useQuery).mockReturnValue({
    plan: "free",
    isPartnerManaged: false,
  });
  expect(render()).toContain("Current page");
});
test("ordinary navigation has no focus redirect or extra profile query", () => {
  vi.mocked(readInboxFocusReturnPath).mockReturnValue(null);
  expect(render()).toContain("Current page");
  expect(useQuery).toHaveBeenLastCalledWith(expect.anything(), "skip");
});
test("does not hijack other screens while a return link is pending", () => {
  vi.mocked(useLocation).mockReturnValue({
    pathname: "/dashboard/other/inbox",
  } as ReturnType<typeof useLocation>);
  expect(render()).toContain("Current page");
});
