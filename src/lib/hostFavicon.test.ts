import { expect, test } from "vitest";
import {
  DEFAULT_DOCUMENT_FAVICON_HREF,
  faviconLinkType,
  resolveHostFaviconHref,
} from "./hostFavicon";

test("uses the uploaded partner logo URL as the hostname favicon", () => {
  expect(resolveHostFaviconHref("https://cdn.test/acme.png")).toBe(
    "https://cdn.test/acme.png",
  );
});

test("keeps the default favicon when a hostname has no logo", () => {
  expect(resolveHostFaviconHref(null)).toBe(DEFAULT_DOCUMENT_FAVICON_HREF);
  expect(resolveHostFaviconHref(undefined)).toBe(DEFAULT_DOCUMENT_FAVICON_HREF);
});

test("does not label a partner logo as SVG so PNG uploads can render", () => {
  expect(faviconLinkType("https://cdn.test/acme.png")).toBeNull();
  expect(faviconLinkType(DEFAULT_DOCUMENT_FAVICON_HREF)).toBe("image/svg+xml");
});
