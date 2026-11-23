import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { InboxFocusFilters } from "./InboxFocusFilters";

vi.mock("@/components/ui/dropdown-menu", () => {
  const Content = ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  );
  return {
    DropdownMenu: Content,
    DropdownMenuTrigger: Content,
    DropdownMenuContent: Content,
    DropdownMenuCheckboxItem: Content,
    DropdownMenuLabel: Content,
    DropdownMenuSeparator: () => <hr />,
  };
});

test("Unread moves into the menu while obsolete handling and Read options are removed", () => {
  const markup = renderToStaticMarkup(
    <InboxFocusFilters
      assignment="unread"
      lastRepliedByAi={false}
      onLastRepliedByAiChange={vi.fn()}
      onAssignmentChange={vi.fn()}
      escalated={false}
      onEscalatedChange={vi.fn()}
      booked={false}
      onBookedChange={vi.fn()}
      platforms={["web"]}
      selectedPlatforms={[]}
      onTogglePlatform={vi.fn()}
    />,
  );
  expect(markup).toContain(">Unread<");
  expect(markup).toContain("Assigned to me");
  expect(markup).toContain("Unassigned");
  expect(markup).toContain("Escalated");
  expect(markup).toContain("Booked");
  expect(markup).not.toContain(">Read<");
  expect(markup).not.toContain("AI handling");
  expect(markup).not.toContain("Human handling");
});
