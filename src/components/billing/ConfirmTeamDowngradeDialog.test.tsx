import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const dialogSource = readFileSync(
  new URL("./ConfirmTeamDowngradeDialog.tsx", import.meta.url),
  "utf8",
);
const adjustPlanSource = readFileSync(
  new URL("../AdjustPlanDialog.tsx", import.meta.url),
  "utf8",
);

describe("team downgrade confirmation", () => {
  test("states the permanent cleanup consequences and actions", () => {
    expect(dialogSource).toContain("Confirm downgrade");
    expect(dialogSource).toContain(
      "Your conversations will be deleted",
    );
    expect(dialogSource).toContain(
      "Your workspace data will be cleared",
    );
    expect(dialogSource).toContain(
      "Your channels will be disconnected",
    );
    expect(dialogSource).toContain("Go back");
    expect(dialogSource).toContain("onConfirm");
    expect(dialogSource).toContain("onOpenChange(false)");
  });

  test("only team downgrades to Free require confirmation", () => {
    expect(adjustPlanSource).toContain("planAndUsage.isTeam");
    expect(adjustPlanSource).toContain("setConfirmDowngradeOpen(true)");
    expect(adjustPlanSource).toContain("<ConfirmTeamDowngradeDialog");
    expect(adjustPlanSource).toContain("await handlePortal()");
  });
});
