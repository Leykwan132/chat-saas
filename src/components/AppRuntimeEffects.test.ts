import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(new URL("./AppRuntimeEffects.tsx", import.meta.url), "utf8");
const layoutSource = readFileSync(
  new URL("../router/AppRouteComponents.tsx", import.meta.url),
  "utf8",
);

test("applies hostname branding as the document favicon on partner hosts only", () => {
  expect(source).toContain("getBrandingForHostname");
  expect(source).toContain("isNativeHost ? 'skip'");
  expect(source).toContain("resolveHostFaviconHref(branding?.logoUrl)");
  expect(layoutSource).toContain("<HostFavicon />");
});
