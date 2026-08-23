import { expect, test } from "vitest";
import previewSource from "./WebWidgetPreview.tsx?raw";
import settingsControlsSource from "./WebWidgetAiSettingsControls.tsx?raw";

test("AI-powered widget settings omit retired placement controls", () => {
  expect(settingsControlsSource).not.toContain("WebWidgetLayoutPicker");
  expect(settingsControlsSource).not.toContain("Pill text");
});

test("AI-powered preview anchors its direct-chat launcher in the bottom right", () => {
  expect(previewSource).toContain("absolute bottom-0 right-0");
  expect(previewSource).toContain("bottom-[64px]");
  expect(previewSource).toContain("right-0 h-[620px] w-[390px]");
  expect(previewSource).toContain("getWidgetLauncherLabel(isOpen)");
});
