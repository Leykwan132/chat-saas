import { describe, expect, test } from "vitest";
import {
  DEFAULT_TRADITIONAL_WIDGET_COLOR,
  DEFAULT_TRADITIONAL_WIDGET_LABEL,
  defaultTraditionalWidgetMessage,
  normalizeTraditionalWidgetColor,
  normalizeTraditionalWidgetLabel,
  normalizeTraditionalWidgetMessage,
  traditionalWhatsAppUrl,
  traditionalWidgetForeground,
} from "./traditionalWebWidget";

describe("traditional web widget settings", () => {
  test("provides the approved defaults from the WhatsApp account name", () => {
    expect(DEFAULT_TRADITIONAL_WIDGET_LABEL).toBe("Chat with us");
    expect(DEFAULT_TRADITIONAL_WIDGET_COLOR).toBe("#25D366");
    expect(defaultTraditionalWidgetMessage("Wati")).toBe(
      "Hi, I'd like to get in touch with the Wati team. Can someone help me?",
    );
  });

  test("normalizes valid settings and rejects invalid boundaries", () => {
    expect(normalizeTraditionalWidgetLabel("  Sales team  ")).toBe("Sales team");
    expect(normalizeTraditionalWidgetMessage("  Hello there  ")).toBe("Hello there");
    expect(normalizeTraditionalWidgetColor("#25d366")).toBe("#25D366");
    expect(() => normalizeTraditionalWidgetLabel(" ")).toThrow("Pill label is required");
    expect(() => normalizeTraditionalWidgetLabel("x".repeat(41))).toThrow(
      "Pill label must be 40 characters or fewer",
    );
    expect(() => normalizeTraditionalWidgetMessage("x".repeat(501))).toThrow(
      "Prefilled message must be 500 characters or fewer",
    );
    expect(() => normalizeTraditionalWidgetColor("green")).toThrow(
      "Main color must use #RRGGBB format",
    );
  });

  test("chooses the higher-contrast monochrome foreground", () => {
    expect(traditionalWidgetForeground("#25D366")).toBe("#000000");
    expect(traditionalWidgetForeground("#111111")).toBe("#FFFFFF");
  });

  test("builds an encoded wa.me destination from a formatted number", () => {
    expect(
      traditionalWhatsAppUrl("+60 12-345 6789", "Hi there & welcome"),
    ).toBe("https://wa.me/60123456789?text=Hi+there+%26+welcome");
    expect(() => traditionalWhatsAppUrl("not-a-number", "Hello")).toThrow(
      "WhatsApp phone number is unavailable",
    );
  });
});
