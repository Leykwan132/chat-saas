import { expect, it } from "vitest";
import { withDeadline } from "./deadline";

it("stops waiting for an unresponsive private backend", async () => {
  const controller = new AbortController();
  const result = withDeadline(
    new Promise<never>(() => undefined),
    controller.signal,
  );
  controller.abort();
  await expect(result).rejects.toThrow("REQUEST_TIMED_OUT");
});
