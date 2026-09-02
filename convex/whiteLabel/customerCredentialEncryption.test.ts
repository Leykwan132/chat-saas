import { afterEach, expect, test, vi } from "vitest";
import {
  decryptInitialCustomerPassword,
  encryptInitialCustomerPassword,
} from "./customerCredentialEncryption";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("encrypts a password without retaining it in ciphertext", () => {
  vi.stubEnv(
    "PARTNER_INITIAL_CREDENTIALS_ENCRYPTION_KEY",
    "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  );

  const encrypted = encryptInitialCustomerPassword("InitialPasswordAa1!");

  expect(encrypted.ciphertext).not.toContain("InitialPasswordAa1!");
  expect(decryptInitialCustomerPassword(encrypted)).toBe(
    "InitialPasswordAa1!",
  );
});

test("rejects a malformed encryption key", () => {
  vi.stubEnv("PARTNER_INITIAL_CREDENTIALS_ENCRYPTION_KEY", "invalid");

  expect(() => encryptInitialCustomerPassword("InitialPasswordAa1!")).toThrow(
    "PARTNER_INITIAL_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
  );
});
