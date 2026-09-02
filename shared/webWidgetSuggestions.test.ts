import { expect, test } from "vitest";
import {
  getVisibleWebWidgetSuggestions,
  normalizeWebWidgetSuggestions,
} from "./webWidgetSuggestions";

test("normalizes exactly three prompt suggestions", () => {
  expect(
    normalizeWebWidgetSuggestions([" Pricing ", "", "Book a demo "]),
  ).toEqual(["Pricing", "", "Book a demo"]);
});

test("rejects a prompt suggestion list that is not exactly three items", () => {
  expect(() => normalizeWebWidgetSuggestions(["Pricing"])).toThrow(
    "exactly three",
  );
});

test("shows non-empty suggestions only before the first message", () => {
  const suggestions = ["Pricing", "Book a demo", "Contact support"];

  expect(getVisibleWebWidgetSuggestions(suggestions, true, 0)).toEqual(
    suggestions,
  );
  expect(getVisibleWebWidgetSuggestions(suggestions, true, 1)).toEqual([]);
});

test("hides suggestions when disabled", () => {
  expect(
    getVisibleWebWidgetSuggestions(["Pricing", "Book a demo", "Contact support"], false, 0),
  ).toEqual([]);
});
