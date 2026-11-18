import { useHostBrand } from "@/hooks/useHostBranding";
vi.mock("@/hooks/useHostBranding", () => ({ useHostBrand: vi.fn() }));
vi.mock("@/components/inbox/InboxFocusUnavailable", () => ({
  InboxFocusUnavailable: () => <div>Choose your workspace</div>,
}));
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { useQuery } from "convex/react";
import { useAuth } from "@/partnerAuth/AppAuthProvider";
import InboxFocusLayout from "./InboxFocusLayout";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/partnerAuth/AppAuthProvider", () => ({ useAuth: vi.fn() }));
vi.mock("@/components/RequireOrganization", () => ({
  RequireOrganization: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("react-router", () => ({
  useParams: () => ({ agentId: "agent123" }),
  useLocation: () => ({
    pathname: "/dashboard/agent123/inbox/focus",
    search: "",
  }),
  useNavigate: () => vi.fn(),
  Outlet: () => <div>Customer conversations</div>,
}));
beforeEach(() => {
  vi.mocked(useHostBrand).mockReturnValue(null);
  vi.mocked(useAuth).mockReturnValue({
    isLoading: false,
    user: { id: "user" },
    signOut: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(useQuery).mockReturnValue({
    _id: "agent123",
    name: "Support inbox",
  });
});

test("renders a focused inbox shell with sharing and no dashboard navigation", () => {
  const markup = renderToStaticMarkup(<InboxFocusLayout />);
  expect(markup).toContain("Support inbox");
  expect(markup).toContain("Customer conversations");
  expect(markup).toContain("Copy inbox link");
  expect(markup).toContain("Account menu");
  expect(markup).toContain('src="/icon.svg"');
  for (const text of [
    "Settings",
    "Upgrade",
    "Knowledge",
    "Calendar",
    "Workspace menu",
  ])
    expect(markup).not.toContain(text);
});

test("does not expose conversations without an accessible agent", () => {
  vi.mocked(useQuery).mockReturnValue(null);
  const markup = renderToStaticMarkup(<InboxFocusLayout />);
  expect(markup).toContain("Choose your workspace");
  expect(markup).not.toContain("Customer conversations");
});

test("uses the same partner logo as the full app", () => {
  vi.mocked(useHostBrand).mockReturnValue({
    name: "Partner",
    logoUrl: "https://brand.example/logo.svg",
  });
  const markup = renderToStaticMarkup(<InboxFocusLayout />);
  expect(markup).toContain('src="https://brand.example/logo.svg"');
  expect(markup).not.toContain('src="/icon.svg"');
});
