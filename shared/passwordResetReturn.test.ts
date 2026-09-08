import { expect, test } from "vitest";
import {
  buildSameOriginPasswordResetUrl,
  parsePasswordResetOrigin,
  sanitizePasswordResetReturnPath,
} from "./passwordResetReturn";

test("keeps password reset on the current origin", () => {
  expect(
    buildSameOriginPasswordResetUrl({
      origin: "https://chat.partner.example",
      token: "reset-token",
      returnPath: "/sign-in",
    }),
  ).toBe(
    "https://chat.partner.example/reset-password?token=reset-token&returnTo=%2Fsign-in",
  );
});

test("rejects absolute return paths that would leave the host", () => {
  expect(sanitizePasswordResetReturnPath("https://kilobot.app/workspace")).toBe(
    "/sign-in",
  );
  expect(sanitizePasswordResetReturnPath("//kilobot.app")).toBe("/sign-in");
  expect(sanitizePasswordResetReturnPath("/https://kilobot.app")).toBe(
    "/sign-in",
  );
  expect(sanitizePasswordResetReturnPath("/workspace/settings")).toBe(
    "/workspace/settings",
  );
});

test("accepts https partner origins and local http", () => {
  expect(parsePasswordResetOrigin("https://chat.partner.example")).toEqual({
    origin: "https://chat.partner.example",
    hostname: "chat.partner.example",
  });
  expect(parsePasswordResetOrigin("http://localhost:5173")).toEqual({
    origin: "http://localhost:5173",
    hostname: "localhost",
  });
  expect(() => parsePasswordResetOrigin("http://chat.partner.example")).toThrow(
    "Invalid reset origin.",
  );
  expect(() =>
    parsePasswordResetOrigin("https://chat.partner.example/extra"),
  ).toThrow("Invalid reset origin.");
});
