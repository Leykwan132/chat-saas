import { expect, test } from "vitest";
import { getPlanLimitChanges } from "./partnerPlanChangeDiff";

test("lists only the limits that change between plans", () => {
  expect(getPlanLimitChanges("growth", "starter")).toEqual([
    { label: "Agents", from: "5", to: "2", direction: "down" },
    { label: "Monthly credits", from: "8,000", to: "2,000", direction: "down" },
    { label: "Team members", from: "10", to: "5", direction: "down" },
    { label: "Knowledge base", from: "20MB", to: "5MB", direction: "down" },
  ]);
});

test("marks higher limits as upgrades including unlimited channels", () => {
  expect(getPlanLimitChanges("free", "starter")).toEqual([
    { label: "Agents", from: "1", to: "2", direction: "up" },
    { label: "Channels", from: "1", to: "Unlimited", direction: "up" },
    { label: "Monthly credits", from: "300", to: "2,000", direction: "up" },
    { label: "Team members", from: "1", to: "5", direction: "up" },
    { label: "Knowledge base", from: "400KB", to: "5MB", direction: "up" },
  ]);
});
