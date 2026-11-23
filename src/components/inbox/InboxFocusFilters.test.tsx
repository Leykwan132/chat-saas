import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { InboxFocusFilters } from "./InboxFocusFilters";

test("shows All and Last replied by AI with muted unselected text", () => {
  const markup = renderToStaticMarkup(
    <InboxFocusFilters
      assignment="all"
      lastRepliedByAi={true}
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
  expect(markup).toContain(">All<");
  expect(markup).not.toContain(">Unread<");
  expect(markup).not.toContain(">Read<");
  expect(markup).toMatch(/aria-pressed="true"[^>]*>.*?Last replied by AI</s);
  expect(markup).toContain("text-muted-foreground");
  expect(markup).toContain("More conversation filters");
});
