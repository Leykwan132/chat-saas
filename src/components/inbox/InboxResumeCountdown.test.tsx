import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { InboxResumeCountdown } from "./InboxResumeCountdown";

afterEach(() => {
  vi.useRealTimers();
});

test("centers the remaining time inside a circular border", () => {
  vi.useFakeTimers();
  vi.setSystemTime(30_000);
  const markup = renderToStaticMarkup(
    <InboxResumeCountdown startedAt={0} dueAt={60_000} />,
  );
  expect(markup).toContain(">30s<");
  expect(markup).toContain("absolute inset-0 flex items-center justify-center");
  expect(markup).toContain('stroke-dashoffset="-50"');
  expect(markup).toContain("transition-[stroke-dashoffset]");
});

test("the ring starts full and finishes empty using the saved duration", () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  expect(
    renderToStaticMarkup(<InboxResumeCountdown startedAt={0} dueAt={60_000} />),
  ).toContain('stroke-dashoffset="0"');
  vi.setSystemTime(60_000);
  const markup = renderToStaticMarkup(
    <InboxResumeCountdown startedAt={0} dueAt={60_000} />,
  );
  expect(markup).toContain('stroke-dashoffset="-100"');
  expect(markup).toContain(">0s<");
});
