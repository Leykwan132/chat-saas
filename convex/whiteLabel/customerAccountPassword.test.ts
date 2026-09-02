import { describe, expect, test } from "vitest";
import { generateInitialCustomerPassword } from "./customerAccountPassword";

describe("generateInitialCustomerPassword", () => {
  test("contains every WorkOS password character class", () => {
    const password = generateInitialCustomerPassword();
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
    expect(password.length).toBeGreaterThanOrEqual(32);
  });
});
