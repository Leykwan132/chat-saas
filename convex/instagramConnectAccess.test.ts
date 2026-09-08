import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test.each(["instagramAuth.ts", "instagramConnect.ts"])(
  "requires the Instagram allowlist in %s",
  (filename) => {
    const source = readFileSync(new URL(`./${filename}`, import.meta.url), "utf8");
    expect(source).toContain("assertWorkosUserCanConnectInstagram");
    expect(source).not.toContain("assertWorkosUserCanConnectInstagramMessenger");
  },
);
