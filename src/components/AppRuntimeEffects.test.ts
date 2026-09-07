import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(new URL("./AppRuntimeEffects.tsx", import.meta.url), "utf8");
const hookSource = readFileSync(
  new URL("../hooks/useHostBranding.ts", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../router/AppRouteComponents.tsx", import.meta.url),
  "utf8",
);

test("applies hostname branding as the document favicon and title on partner hosts only", () => {
  expect(source).toContain("useHostBranding()");
  expect(hookSource).toContain("getBrandingForHostname");
  expect(hookSource).toContain("native ? 'skip'");
  expect(source).toContain("resolveHostFaviconHref(branding?.logoUrl)");
  expect(source).toContain("resolveHostDocumentTitle");
  expect(layoutSource).toContain("<HostFavicon />");
});
