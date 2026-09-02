import { expect, test } from "vitest";
import { getWidgetEntryScreen } from "./widgetEntryScreen";

test("routes returning visitors directly to chat", () => {
  expect(getWidgetEntryScreen(true, true)).toBe("chat");
  expect(getWidgetEntryScreen(true, false)).toBe("form");
  expect(getWidgetEntryScreen(false, false)).toBe("chat");
});
