import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { FocusNotificationSettings } from "./FocusNotificationSettings";

const state = vi.hoisted(() => ({
  enabled: false,
  configured: true,
  enable: vi.fn(async () => {}),
  changePreferences: vi.fn(async () => {}),
  onCheckedChange: undefined as undefined | ((checked: boolean) => void),
}));
vi.mock("@/components/notifications/usePushNotificationSettings", () => ({
  usePushNotificationSettings: () => ({
    enabled: state.enabled,
    settings: {
      configured: state.configured,
      subscription: { kinds: ["humanEscalation"] },
    },
    busy: false,
    support: null,
    deviceError: null,
    eligibleOptions: [{ kind: "humanEscalation" }, { kind: "bookingCreated" }],
    perform: (work: () => Promise<void>) => work(),
    enable: state.enable,
    changePreferences: state.changePreferences,
  }),
}));
vi.mock("@/components/ui/switch", () => ({
  Switch: (props: {
    onCheckedChange: (checked: boolean) => void;
    checked: boolean;
    disabled: boolean;
  }) => {
    state.onCheckedChange = props.onCheckedChange;
    return (
      <button
        role="switch"
        aria-checked={props.checked}
        disabled={props.disabled}
      />
    );
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.enabled = false;
  state.configured = true;
});
function render() {
  return renderToStaticMarkup(
    <FocusNotificationSettings agentId={"agent" as never} />,
  );
}
test("shows simple status and enables all permitted notifications", () => {
  const markup = render();
  expect(markup).toContain("Disabled");
  expect(markup).not.toContain("humanEscalation");
  state.onCheckedChange!(true);
  expect(state.enable).toHaveBeenCalledWith([
    "humanEscalation",
    "bookingCreated",
  ]);
});
test("disables the current subscription", () => {
  state.enabled = true;
  expect(render()).toContain("Enabled");
  state.onCheckedChange!(false);
  expect(state.changePreferences).toHaveBeenCalledWith(
    ["humanEscalation"],
    false,
  );
});
test("explains when notifications are not configured", () => {
  state.configured = false;
  const markup = render();
  expect(markup).toContain("disabled");
  expect(markup).toContain("Notifications are not configured yet.");
});
