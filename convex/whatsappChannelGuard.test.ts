import { expect, test } from "vitest";
import { assertAgentCanConnectWhatsApp } from "./whatsappChannelGuard";

test("rejects a different active WABA for the same agent", () => {
  expect(() =>
    assertAgentCanConnectWhatsApp(
      [
        {
          wabaId: "waba-existing",
          status: "connected",
        },
      ],
      "waba-new",
    ),
  ).toThrow("This agent already has a different WhatsApp account connected.");
});

test("allows the same WABA or a disconnected WABA", () => {
  expect(() =>
    assertAgentCanConnectWhatsApp(
      [
        { wabaId: "waba-same", status: "connected" },
        { wabaId: "waba-old", status: "disconnected" },
      ],
      "waba-same",
    ),
  ).not.toThrow();
});
