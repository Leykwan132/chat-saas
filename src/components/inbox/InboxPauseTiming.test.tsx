import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { InboxChatAiControl } from "./InboxChatAiControl";
import { InboxResumeTiming } from "./InboxResumeTiming";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Id } from "../../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({ useMutation: () => vi.fn() }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
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
    DialogFooter: Content,
  };
});

test("an active conversation offers a timed pause alongside immediate pause", () => {
  const markup = renderToStaticMarkup(
    <TooltipProvider>
      <InboxChatAiControl
        chat={{
          id: "chat" as Id<"conversations">,
          handling: "ai",
          aiControlAvailable: true,
        }}
      />
    </TooltipProvider>,
  );
  expect(markup).toContain("Schedule resume");
  expect(markup).toContain(">Pause AI<");
});

test("timed pause labels its duration while retaining resume limits", () => {
  const markup = renderToStaticMarkup(
    <InboxResumeTiming
      label="Pause for (minutes)"
      minutes="5"
      disabled={false}
      onMinutesChange={vi.fn()}
    />,
  );
  expect(markup).toContain("Pause for (minutes)");
  expect(markup).toContain('min="1"');
  expect(markup).toContain('max="10080"');
});
