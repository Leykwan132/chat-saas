import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("uses the Instagram Embedded Signup configuration", () => {
  const source = readFileSync(
    new URL("./ConnectInstagramButton.tsx", import.meta.url),
    "utf8",
  );

  expect(source).toContain("VITE_IG_CONFIG_ID");
  expect(source).toContain("VITE_MESSENGER_CODE_EXCHANGE_REDIRECT_URI");
  expect(source).not.toContain("VITE_IG_CODE_EXCHANGE_REDIRECT_URI");
  expect(source).toContain("api.instagramEmbeddedSignup.completeSignup");
  expect(source).toContain("config_id: configId");
  expect(source).not.toContain("api.instagramAuth.start");
});
