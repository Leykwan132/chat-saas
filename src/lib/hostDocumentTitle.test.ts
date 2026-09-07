import { expect, test } from "vitest";
import {
  DEFAULT_DOCUMENT_TITLE,
  resolveHostDocumentTitle,
} from "./hostDocumentTitle";

test("uses a custom partner page title on the hostname", () => {
  expect(
    resolveHostDocumentTitle({
      pageTitle: "Acme Helpdesk",
      partnerName: "Acme Studio",
    }),
  ).toBe("Acme Helpdesk");
});

test("falls back to the partner brand name instead of Kilobot", () => {
  expect(
    resolveHostDocumentTitle({
      pageTitle: null,
      partnerName: "Acme Studio",
    }),
  ).toBe("Acme Studio");
  expect(
    resolveHostDocumentTitle({
      pageTitle: "   ",
      partnerName: "Acme Studio",
    }),
  ).toBe("Acme Studio");
});

test("keeps the Kilobot title only when there is no partner brand", () => {
  expect(resolveHostDocumentTitle(null)).toBe(DEFAULT_DOCUMENT_TITLE);
  expect(resolveHostDocumentTitle(undefined)).toBe(DEFAULT_DOCUMENT_TITLE);
});
