import { describe, expect, test } from "vitest";
import {
  canSendWebWidgetPreview,
  getModernWidgetPreviewEntryScreen,
  getTraditionalWidgetFormState,
  getWebWidgetPreviewQueryArgs,
  getWidgetLauncherLabel,
  shouldShowSuggestionsConfiguration,
  shouldShowVisitorFormConfiguration,
} from "./webWidgetConfigurationState";

describe("AI widget preview state", () => {
  test("turns the launcher into a close control while the widget is open", () => {
    expect(getWidgetLauncherLabel(false)).toBe("Open chat");
    expect(getWidgetLauncherLabel(true)).toBe("Close chat");
  });

  test("hides visitor form configuration until collection is enabled", () => {
    expect(shouldShowVisitorFormConfiguration(false)).toBe(false);
    expect(shouldShowVisitorFormConfiguration(true)).toBe(true);
  });

  test("hides suggestion configuration until suggestions are enabled", () => {
    expect(shouldShowSuggestionsConfiguration(false)).toBe(false);
    expect(shouldShowSuggestionsConfiguration(true)).toBe(true);
  });

  test("routes a new visitor through the enabled visitor form", () => {
    expect(
      getModernWidgetPreviewEntryScreen({
        leadFormEnabled: true,
        hasVisitorProfile: false,
      }),
    ).toBe("form");
  });

  test("opens chat when collection is disabled or the visitor profile already exists", () => {
    expect(
      getModernWidgetPreviewEntryScreen({
        leadFormEnabled: false,
        hasVisitorProfile: false,
      }),
    ).toBe("chat");
    expect(
      getModernWidgetPreviewEntryScreen({
        leadFormEnabled: true,
        hasVisitorProfile: true,
      }),
    ).toBe("chat");
  });

  test("skips message access when explicitly disabled", () => {
    expect(getWebWidgetPreviewQueryArgs(false, "pub_key", "visitor-id")).toBe(
      "skip",
    );
    expect(
      canSendWebWidgetPreview({
        enabled: false,
        content: "Hello",
        sending: false,
      }),
    ).toBe(false);
  });

  test("enables message access and sending", () => {
    expect(getWebWidgetPreviewQueryArgs(true, "pub_key", "visitor-id")).toEqual(
      {
        publicKey: "pub_key",
        visitorId: "visitor-id",
      },
    );
    expect(
      canSendWebWidgetPreview({
        enabled: true,
        content: " Hello ",
        sending: false,
      }),
    ).toBe(true);
  });
});

describe("Traditional widget form state", () => {
  const saved = {
    label: "Chat with us",
    prefillMessage: "Hello team",
    hidePoweredBy: false,
  };

  test("allows valid changed settings to save without publishing them", () => {
    expect(
      getTraditionalWidgetFormState({
        busy: false,
        draft: { ...saved, label: "Talk to us" },
        saved,
      }),
    ).toEqual({ valid: true, dirty: true, canSave: true });
  });

  test("rejects blank and overlong drafts", () => {
    expect(
      getTraditionalWidgetFormState({
        busy: false,
        draft: { ...saved, label: " " },
        saved,
      }).valid,
    ).toBe(false);
    expect(
      getTraditionalWidgetFormState({
        busy: false,
        draft: { ...saved, prefillMessage: "x".repeat(501) },
        saved,
      }).valid,
    ).toBe(false);
  });
});
