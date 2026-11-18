import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { useQuery } from "convex/react";
import { useActiveTeam } from "@/hooks/useActiveTeam";
import { InboxFocusUnavailable } from "./InboxFocusUnavailable";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/hooks/useActiveTeam", () => ({ useActiveTeam: vi.fn() }));
vi.mock("react-router", () => ({
  useLocation: () => ({
    pathname: "/dashboard/agent123/inbox/focus",
    search: "",
  }),
}));

test("offers existing workspaces while retaining an escape for wrong accounts", () => {
  vi.mocked(useQuery).mockReturnValue([
    { _id: "personal", name: "Personal" },
    { _id: "team123", name: "Customer team" },
  ]);
  vi.mocked(useActiveTeam).mockReturnValue({
    activeTeam: { _id: "personal" },
    switchTeam: vi.fn(),
  } as unknown as ReturnType<typeof useActiveTeam>);
  const markup = renderToStaticMarkup(
    <InboxFocusUnavailable onSignOut={vi.fn()} />,
  );
  expect(markup).toContain("Open Customer team");
  expect(markup).not.toContain("Open Personal");
  expect(markup).toContain("Sign out");
  expect(markup).not.toContain("Settings");
});
