import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test.each(["messengerConnect.ts", "messengerAuth.ts"])(
  "requires the Messenger allowlist in %s",
  (filename) => {
    const source = readFileSync(new URL(`./${filename}`, import.meta.url), "utf8");
    expect(source).toContain("assertWorkosUserCanConnectMessenger");
    expect(source).not.toContain("assertWorkosUserCanConnectInstagramMessenger");
  },
);
