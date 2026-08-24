"use node";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const KEY_ENVIRONMENT_VARIABLE = "PARTNER_INITIAL_CREDENTIALS_ENCRYPTION_KEY";
const KEY_ERROR = `${KEY_ENVIRONMENT_VARIABLE} must be a base64-encoded 32-byte key.`;

export type EncryptedCustomerCredential = {
  ciphertext: string;
  initializationVector: string;
  authenticationTag: string;
  keyVersion: "v1";
};

function getEncryptionKey() {
  const encodedKey = process.env[KEY_ENVIRONMENT_VARIABLE];
  if (
    encodedKey === undefined ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(encodedKey) ||
    encodedKey.length % 4 !== 0
  ) {
    throw new Error(KEY_ERROR);
  }
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error(KEY_ERROR);
  return key;
}

export function encryptInitialCustomerPassword(password: string) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), initializationVector);
  const ciphertext = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    initializationVector: initializationVector.toString("base64"),
    authenticationTag: cipher.getAuthTag().toString("base64"),
    keyVersion: "v1" as const,
  };
}

export function decryptInitialCustomerPassword(
  credential: EncryptedCustomerCredential,
) {
  if (credential.keyVersion !== "v1") {
    throw new Error("Customer credential encryption version is unavailable.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(credential.initializationVector, "base64"),
  );
  decipher.setAuthTag(Buffer.from(credential.authenticationTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(credential.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
