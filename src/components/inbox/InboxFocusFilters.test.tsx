import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { InboxFocusFilters } from "./InboxFocusFilters";

test("shows All, Unread and Read with the selected read filter", () => {
  const markup = renderToStaticMarkup(
    <InboxFocusFilters
      assignment="read"
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
  expect(markup).toContain(">All<");
  expect(markup).toContain(">Unread<");
  expect(markup).toMatch(/aria-pressed="true"[^>]*>.*?Read</s);
  expect(markup).toContain("More conversation filters");
});
