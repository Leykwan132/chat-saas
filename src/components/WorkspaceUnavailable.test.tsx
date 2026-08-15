import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const componentSource = readFileSync(
  new URL("./WorkspaceUnavailable.tsx", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../layouts/DashboardLayout.tsx", import.meta.url),
  "utf8",
);
const teamSwitcherSource = readFileSync(
  new URL("./TeamSwitcher.tsx", import.meta.url),
  "utf8",
);

describe("workspace unavailable recovery", () => {
  test("shows only the approved recovery message and action", () => {
    expect(componentSource).toContain("Workspace no longer available");
    expect(componentSource).toContain("Back to Personal");
    expect(componentSource).not.toContain("Contact support");
    expect(componentSource).not.toContain("DialogDescription");
  });

  test("switches to Personal before replacing the stale route", () => {
    expect(layoutSource).toContain("<WorkspaceUnavailable");
    expect(layoutSource).toContain("await switchTeam");
    expect(layoutSource).toContain(
      "navigate('/workspace', { replace: true })",
    );
  });

  test("shows a switching screen before stale-agent recovery", () => {
    expect(layoutSource).toContain("isSwitchingWorkspace");
    expect(layoutSource).toContain("Switching workspace...");
    expect(layoutSource.indexOf("isSwitchingWorkspace")).toBeLessThan(
      layoutSource.indexOf("if (agent === null)"),
    );
  });

  test("notifies the dashboard when a workspace switch begins or fails", () => {
    expect(teamSwitcherSource).toContain("onTeamSwitchStart");
    expect(teamSwitcherSource).toContain("onTeamSwitchFailed");
  });
});
