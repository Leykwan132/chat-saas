import { expect, test } from "vitest";
import { findEscalationKeyword, normalizeEscalationKeywords } from "./escalationKeywords";

test("matches any keyword or phrase as a case-insensitive substring", () => {
  expect(findEscalationKeyword("Please get a HUMAN agent", ["refund", "human"])).toBe("human");
  expect(findEscalationKeyword("I want to TALK TO SOMEONE now", ["talk to someone"])).toBe("talk to someone");
  expect(findEscalationKeyword("humanity", ["human"])).toBe("human");
});

test("does not match empty keywords or unrelated messages", () => {
  expect(findEscalationKeyword("hello", ["", "  ", "human"])).toBeUndefined();
  expect(findEscalationKeyword("", ["human"])).toBeUndefined();
});

test("normalizes keywords and rejects oversized settings", () => {
  expect(normalizeEscalationKeywords([" Human ", "human", "退款", ""])).toEqual(["Human", "退款"]);
  expect(() => normalizeEscalationKeywords(["a".repeat(101)])).toThrow();
  expect(() => normalizeEscalationKeywords(Array.from({ length: 51 }, (_, index) => `${index}`))).toThrow();
});
