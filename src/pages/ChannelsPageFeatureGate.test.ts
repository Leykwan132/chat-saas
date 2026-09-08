import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("gates Instagram and Messenger connect cards with separate flags", () => {
  const source = readFileSync(new URL("./ChannelsPage.tsx", import.meta.url), "utf8");

  expect(source).toContain("useEnableInstagram");
  expect(source).toContain("useEnableMessenger");
  expect(source).toContain("isInstagramUserAllowed(user?.email)");
  expect(source).toContain("isMessengerUserAllowed(user?.email)");
  expect(source).not.toContain("useEnableInstagramMessenger");
  expect(source).not.toContain("instagramMessengerEnabled");
});
