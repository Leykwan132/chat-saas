import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("does not emit Messenger OAuth or Page-list diagnostics", () => {
  const source = readFileSync(
    new URL("./messengerConnect.ts", import.meta.url),
    "utf8",
  );

  expect(source).not.toContain('console.info("[messenger]');
});
