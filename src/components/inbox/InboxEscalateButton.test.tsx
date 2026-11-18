import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { InboxEscalateButton } from "./InboxEscalateButton";

vi.mock("convex/react", () => ({ useMutation: vi.fn(), useQuery: vi.fn() }));
beforeEach(() => {
  vi.mocked(useMutation).mockReturnValue(
    Object.assign(vi.fn(), { withOptimisticUpdate: vi.fn() }),
  );
  vi.mocked(useQuery).mockReturnValue(null);
});
afterEach(() => {
  vi.useRealTimers();
});
const conversationId = "conversation" as Id<"conversations">;
function render(escalated = false, disabled = false) {
  return renderToStaticMarkup(
    <InboxEscalateButton
      conversationId={conversationId}
      escalated={escalated}
      disabled={disabled}
      onDeescalate={vi.fn()}
    />,
  );
}

test("offers internal escalation instead of clearing the conversation", () => {
  const markup = render();
  expect(markup).toContain(">Escalate<");
  expect(markup).toContain("bg-destructive");
  expect(markup).not.toContain('disabled=""');
  expect(markup).not.toContain("Clear Conversation");
  expect(useQuery).toHaveBeenLastCalledWith(expect.anything(), "skip");
});

test("an escalated chat offers enabled Resolve instead of another escalation", () => {
  const markup = render(true);
  expect(markup).toContain(">Resolve<");
  expect(markup).toContain("bg-emerald-700");
  expect(markup).not.toContain('disabled=""');
  expect(useQuery).toHaveBeenLastCalledWith(expect.anything(), {
    conversationId,
  });
});

test("missing selection or permission disables the action", () => {
  expect(render(false, true)).toContain('disabled=""');
  expect(
    renderToStaticMarkup(
      <InboxEscalateButton
        conversationId={null}
        escalated={false}
        disabled={false}
        onDeescalate={vi.fn()}
      />,
    ),
  ).toContain('disabled=""');
});

test("the red action contains the live countdown and draining overlay", () => {
  vi.useFakeTimers();
  vi.setSystemTime(301_000);
  vi.mocked(useQuery).mockReturnValue({ startedAt: 1_000, dueAt: 601_000 });
  const markup = render(true);
  expect(markup).toContain("Auto Resolve in 05:00");
  expect(markup).toContain("width:50%");
  expect(markup).toContain("bg-emerald-700");
  expect(markup).not.toContain('disabled=""');
});

test("a timer arriving after an idle button starts with a fresh clock", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
  expect(render(true)).toContain(">Resolve<");
  vi.setSystemTime(11_000);
  vi.mocked(useQuery).mockReturnValue({ startedAt: 11_000, dueAt: 71_000 });
  const markup = render(true);
  expect(markup).toContain("Auto Resolve in 01:00");
  expect(markup).toContain("width:100%");
  vi.setSystemTime(71_000);
  expect(render(true)).toContain("Auto Resolve in 00:00");
  expect(render(true)).toContain("width:0%");
});
