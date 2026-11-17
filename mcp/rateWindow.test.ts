import { expect, it } from "vitest";
import { consumeWindow } from "./rateWindow";

it("rejects the 31st request and resets after 60 seconds", () => {
  let window = { startedAt: 1000, count: 0 };
  for (let index = 0; index < 30; index++) {
    const result = consumeWindow(window, 1000, 30);
    expect(result.allowed).toBe(true);
    window = result.window;
  }
  expect(consumeWindow(window, 2000, 30).allowed).toBe(false);
  expect(consumeWindow(window, 61000, 30).allowed).toBe(true);
});
