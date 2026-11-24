import { afterEach, expect, test, vi } from "vitest";
import {
  clearLastLocations,
  locationKey,
  restoreDestination,
} from "./lastLocation";
import { isInstalledApp } from "./installedApp";

afterEach(() => vi.unstubAllGlobals());

test("saved locations are separated by user and team", () => {
  expect(locationKey("user-a", "team-a")).not.toBe(
    locationKey("user-b", "team-a"),
  );
  expect(locationKey("user-a", "team-a")).not.toBe(
    locationKey("user-a", "team-b"),
  );
});

test("restore preserves conversation and rejects inaccessible agents and external destinations", () => {
  expect(
    restoreDestination("/dashboard/agent-a/inbox?conversation=chat-a", [
      "agent-a",
    ]),
  ).toBe("/dashboard/agent-a/inbox?conversation=chat-a");
  for (const path of [
    "/dashboard/agent-b/inbox",
    "//evil.example/workspace",
    "https://evil.example/workspace",
    "/callback",
    "/workspace-other",
  ]) {
    expect(restoreDestination(path, ["agent-a"])).toBeNull();
  }
  expect(restoreDestination("/workspace/settings", [])).toBe(
    "/workspace/settings",
  );
});

test("logout removes saved locations without removing unrelated preferences", () => {
  const key = locationKey("user-a", "team-a");
  const storage = {
    [key]: "/workspace/settings",
    theme: "dark",
    removeItem: vi.fn(),
  };
  vi.stubGlobal("localStorage", storage);
  clearLastLocations();
  expect(storage.removeItem).toHaveBeenCalledTimes(1);
  expect(storage.removeItem).toHaveBeenCalledWith(key);
});

test("installed app detection supports standalone and iOS but excludes browser tabs", () => {
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
  vi.stubGlobal("navigator", {});
  expect(isInstalledApp()).toBe(false);
  vi.stubGlobal("navigator", { standalone: true });
  expect(isInstalledApp()).toBe(true);
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({
      matches: query === "(display-mode: standalone)",
    }),
  });
  expect(isInstalledApp()).toBe(true);
});
