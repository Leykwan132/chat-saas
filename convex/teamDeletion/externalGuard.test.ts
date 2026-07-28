import { expect, test } from "vitest";
import { createExternalStateSafely } from "./externalGuard";

test("removes an external object created while workspace deletion starts", async () => {
  let workspaceAvailable = true;
  let finishCreation: ((value: string) => void) | undefined;
  const created = new Promise<string>((resolve) => {
    finishCreation = resolve;
  });
  const removed: string[] = [];
  const registered: string[] = [];

  const result = createExternalStateSafely({
    assertCanCreate: async () => {
      if (!workspaceAvailable) throw new Error("Workspace unavailable");
    },
    create: async () => await created,
    register: async (value) => {
      registered.push(value);
      return workspaceAvailable;
    },
    remove: async (value) => {
      removed.push(value);
    },
    release: async (value) => {
      registered.splice(registered.indexOf(value), 1);
    },
  });

  await Promise.resolve();
  workspaceAvailable = false;
  finishCreation?.("external_123");

  await expect(result).rejects.toThrow("Workspace unavailable");
  expect(removed).toEqual(["external_123"]);
  expect(registered).toEqual([]);
});

test("retains the durable cleanup obligation when compensation fails", async () => {
  const registered: string[] = [];

  const result = createExternalStateSafely({
    assertCanCreate: async () => undefined,
    create: async () => "external_456",
    register: async (value) => {
      registered.push(value);
      return false;
    },
    remove: async () => {
      throw new Error("Provider unavailable");
    },
    release: async (value) => {
      registered.splice(registered.indexOf(value), 1);
    },
  });

  await expect(result).rejects.toThrow("Provider unavailable");
  expect(registered).toEqual(["external_456"]);
});

test("keeps the resource registered after creation returns to its caller", async () => {
  const registered: string[] = [];
  const result = await createExternalStateSafely({
    assertCanCreate: async () => undefined,
    create: async () => "external_789",
    register: async (value) => {
      registered.push(value);
      return true;
    },
    remove: async () => undefined,
    release: async () => undefined,
  });

  expect(result).toBe("external_789");
  expect(registered).toEqual(["external_789"]);
});

test("removes the created object when durable registration fails", async () => {
  const removed: string[] = [];

  const result = createExternalStateSafely({
    assertCanCreate: async () => undefined,
    create: async () => "external_registration_failure",
    register: async () => {
      throw new Error("Registry unavailable");
    },
    remove: async (value) => {
      removed.push(value);
    },
    release: async () => undefined,
  });

  await expect(result).rejects.toThrow("Registry unavailable");
  expect(removed).toEqual(["external_registration_failure"]);
});

test("retries registration with the same ID when compensation also fails", async () => {
  let createCalls = 0;
  let registerCalls = 0;
  let cleanupRequired = false;

  const result = createExternalStateSafely({
    assertCanCreate: async () => undefined,
    create: async () => {
      createCalls += 1;
      return "external_stable_id";
    },
    register: async (_value, requiresCleanup) => {
      registerCalls += 1;
      if (registerCalls === 1) throw new Error("Registry unavailable");
      cleanupRequired = requiresCleanup;
      return !requiresCleanup;
    },
    remove: async () => {
      throw new Error("Provider unavailable");
    },
    release: async () => undefined,
  });

  await expect(result).rejects.toThrow("Provider unavailable");
  expect(createCalls).toBe(1);
  expect(registerCalls).toBe(2);
  expect(cleanupRequired).toBe(true);
});
