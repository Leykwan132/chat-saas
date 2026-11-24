import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { SidebarNotificationButton } from "./SidebarNotificationButton";

const state = vi.hoisted(() => ({
  installed: true,
  enabled: false,
  configured: true,
  busy: false,
}));
vi.mock("@/pwa/installedApp", () => ({
  isInstalledApp: () => state.installed,
}));
vi.mock("./usePushNotificationSettings", () => ({
  usePushNotificationSettings: () => ({
    settings: { configured: state.configured },
    enabled: state.enabled,
    busy: state.busy,
    support: null,
    eligibleOptions: [{}],
    perform: vi.fn(),
    enable: vi.fn(),
  }),
}));

afterEach(() =>
  Object.assign(state, {
    installed: true,
    enabled: false,
    configured: true,
    busy: false,
  }),
);

function markup() {
  return renderToStaticMarkup(
    <SidebarNotificationButton agentId={"agent" as Id<"agents">} />,
  );
}

test("offers a simple button in the installed app", () => {
  expect(markup()).toContain("Turn on notifications");
});

test("does not offer subscription in a normal browser tab", () => {
  state.installed = false;
  expect(markup()).toBe("");
});

test("hides the button after subscribing and before delivery is configured", () => {
  state.enabled = true;
  expect(markup()).toBe("");
  state.enabled = false;
  state.configured = false;
  expect(markup()).toBe("");
});

test("prevents duplicate clicks during setup", () => {
  state.busy = true;
  expect(markup()).toContain("disabled");
  expect(markup()).toContain("Turning on…");
});
