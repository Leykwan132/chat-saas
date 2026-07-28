import { describe, expect, test } from "vitest";
import { selectLatestStripeSubscription } from "./latestStripeSubscription";

describe("selectLatestStripeSubscription", () => {
  test("uses the latest row when an older subscription is active", () => {
    expect(
      selectLatestStripeSubscription([
        { id: "older", status: "active" },
        { id: "latest", status: "canceled" },
      ]),
    ).toEqual({ id: "latest", status: "canceled" });
  });

  test("uses the latest row when the latest subscription is active", () => {
    expect(
      selectLatestStripeSubscription([
        { id: "older", status: "canceled" },
        { id: "latest", status: "active" },
      ]),
    ).toEqual({ id: "latest", status: "active" });
  });

  test("returns undefined when no subscriptions exist", () => {
    expect(selectLatestStripeSubscription([])).toBeUndefined();
  });
});
