import { expect, test } from "vitest";
import { autoResolveCountdown } from "./autoResolveCountdown";

const timer = { startedAt: 1_000, dueAt: 601_000 };

test("counts down in seconds and fills by elapsed time", () => {
  expect(autoResolveCountdown(timer, 1_000)).toEqual({
    label: "10:00",
    progress: 0,
  });
  expect(autoResolveCountdown(timer, 301_000)).toEqual({
    label: "05:00",
    progress: 0.5,
  });
  expect(autoResolveCountdown(timer, 600_001).label).toBe("00:01");
});

test("clamps overdue and future start times", () => {
  expect(autoResolveCountdown(timer, 700_000)).toEqual({
    label: "00:00",
    progress: 1,
  });
  expect(autoResolveCountdown(timer, 0).progress).toBe(0);
});

test("resetting the actual timer restarts progress", () => {
  expect(
    autoResolveCountdown({ startedAt: 301_000, dueAt: 901_000 }, 301_000),
  ).toEqual({ label: "10:00", progress: 0 });
});

test("long timers include hours", () => {
  expect(
    autoResolveCountdown({ startedAt: 0, dueAt: 90_061_000 }, 0).label,
  ).toBe("25:01:01");
});

test("a one-minute timer never starts above its configured duration", () => {
  expect(
    autoResolveCountdown({ startedAt: 11_000, dueAt: 71_000 }, 1_000),
  ).toEqual({ label: "01:00", progress: 0 });
});
