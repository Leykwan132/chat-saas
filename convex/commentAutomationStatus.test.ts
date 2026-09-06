import { describe, expect, it } from "vitest";
import { getAutomationToggleResult } from "./commentAutomationStatus";

describe("getAutomationToggleResult", () => {
  it("activates immediately when every selected page is subscribed", () => {
    expect(getAutomationToggleResult(true, ["subscribed", "subscribed"])).toEqual({
      status: "active",
      needsSubscription: false,
    });
  });

  it("deactivates immediately when requested", () => {
    expect(getAutomationToggleResult(false, ["subscribed"])).toEqual({
      status: "inactive",
      needsSubscription: false,
    });
  });

  it("keeps pending subscriptions inactive until they succeed", () => {
    expect(getAutomationToggleResult(true, ["pending"])).toEqual({
      status: "inactive",
      needsSubscription: true,
    });
  });
});
