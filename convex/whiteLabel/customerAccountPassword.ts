"use node";

import { randomBytes } from "node:crypto";

export function generateInitialCustomerPassword() {
  return randomBytes(32).toString("base64url") + "Aa1!";
}
