import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { useQuery } from "convex/react";
import { InboxFocusSettings } from "./InboxFocusSettings";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/partnerAuth/AppAuthProvider", () => ({
  useAuth: () => ({ user: { email: "person@example.com" } }),
}));
vi.mock("@/components/ResetPasswordDialog", () => ({
  ResetPasswordDialog: () => null,
}));
vi.mock("@/components/ui/dialog", () => {
  const Content = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    Dialog: Content,
    DialogContent: Content,
    DialogHeader: Content,
    DialogTitle: Content,
    DialogDescription: Content,
  };
});

test("focus settings offers password reset for password accounts", () => {
  vi.mocked(useQuery).mockReturnValue(true);
  const markup = renderToStaticMarkup(
    <InboxFocusSettings open onOpenChange={vi.fn()} />,
  );
  expect(markup).toContain("Settings");
  expect(markup).toContain("person@example.com");
  expect(markup).toContain("Reset password");
});

test("provider-managed accounts do not offer password reset", () => {
  vi.mocked(useQuery).mockReturnValue(false);
  const markup = renderToStaticMarkup(
    <InboxFocusSettings open onOpenChange={vi.fn()} />,
  );
  expect(markup).not.toContain("Reset password");
  expect(markup).toContain("managed by your sign-in provider");
});

test("closed settings does not request account password details", () => {
  vi.mocked(useQuery).mockReturnValue(undefined);
  renderToStaticMarkup(
    <InboxFocusSettings open={false} onOpenChange={vi.fn()} />,
  );
  expect(useQuery).toHaveBeenLastCalledWith(expect.anything(), "skip");
});
