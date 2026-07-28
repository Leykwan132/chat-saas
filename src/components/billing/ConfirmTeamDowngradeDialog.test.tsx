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
      "All conversations, messages, contacts, agent threads, and conversation history will be permanently removed.",
    );
    expect(dialogSource).toContain(
      "Your workspace data will be cleared",
    );
    expect(dialogSource).toContain(
      "Agents, workflows, knowledge, files, analytics, settings, and team memberships will be deleted.",
    );
    expect(dialogSource).toContain(
      "Your channels will be disconnected",
    );
    expect(dialogSource).toContain(
      "WhatsApp, Instagram, Messenger, web widgets, and associated credentials will be removed and will stop processing messages.",
    );
    expect(dialogSource).toContain(
      "Once your downgrade is completed, your team workspace and its data will be permanently deleted. This cannot be undone.",
    );
    expect(dialogSource).toContain("Go back");
    expect(dialogSource).toContain("onConfirm");
    expect(dialogSource).toContain("onOpenChange(false)");
  });

  test("only team downgrades to Free require confirmation", () => {
    expect(adjustPlanSource).toContain("api.freePlanDowngrade.execute");
    expect(adjustPlanSource).toContain("planAndUsage?.isTeam");
    expect(adjustPlanSource).toContain("setConfirmDowngradeOpen(true)");
    expect(adjustPlanSource).toContain("<ConfirmTeamDowngradeDialog");
    expect(adjustPlanSource).toContain("await downgradeToFree");
    expect(adjustPlanSource).not.toContain("createFreeCheckout");
  });
});
