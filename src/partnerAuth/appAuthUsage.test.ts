import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const srcRoot = new URL("../", import.meta.url).pathname;
const allowedWorkosAuthImporters = new Set([
  "partnerAuth/AppAuthProvider.tsx",
  "router/AppRouteComponents.tsx",
]);

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

test("only the auth providers import useAuth from WorkOS; everything else uses the host-aware hook", () => {
  const offenders = listSourceFiles(srcRoot)
    .filter((path) =>
      /from ['"]@workos-inc\/authkit-react['"]/.test(readFileSync(path, "utf8")),
    )
    .map((path) => path.slice(srcRoot.length))
    .filter((relative) => !allowedWorkosAuthImporters.has(relative));

  expect(offenders).toEqual([]);
});
