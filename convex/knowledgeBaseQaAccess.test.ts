import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const sourcePath = fileURLToPath(new URL("./knowledgeBase.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");
const cloudflareSourcePath = fileURLToPath(new URL("./cloudflare.ts", import.meta.url));
const cloudflareSource = readFileSync(cloudflareSourcePath, "utf8");

test("Q&A writes require knowledge-base management permission", () => {
  expect(source).toContain("Permission.KB_MANAGE");
  expect(source.match(/assertKnowledgeBaseManage\(ctx\)/g)).toHaveLength(3);
});

test("Q&A reads require knowledge-base read permission", () => {
  expect(source).toContain("Permission.KB_READ");
  expect(source).toContain("assertKnowledgeBaseRead(ctx)");
});

test("Q&A has no public Cloudflare indexing actions", () => {
  expect(cloudflareSource).not.toContain("export const uploadQAEntry");
  expect(cloudflareSource).not.toContain("export const updateQAEntry");
  expect(cloudflareSource).not.toContain("export const deleteQAEntry");
  expect(cloudflareSource).not.toContain("export const enqueueQAUpload");
});

test("the generic delete action queues Q&A on the delete workpool", () => {
  const enqueueDeleteSource = cloudflareSource.slice(
    cloudflareSource.indexOf("export const enqueueDelete"),
    cloudflareSource.indexOf("export const internalSearch"),
  );
  expect(enqueueDeleteSource).toContain('v.id("qaEntries")');
  expect(enqueueDeleteSource).toContain('v.literal("qa")');
  expect(enqueueDeleteSource).toContain("cfDeletePool.enqueueAction");
});
