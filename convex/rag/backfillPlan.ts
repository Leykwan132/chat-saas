export type KnowledgeBackfillTable = "text" | "file" | "web" | "qa";

export function isKnowledgeBackfillBusy(status?: string) {
  return status === "queued"
    || status === "processing"
    || status === "deleting"
    || status === "gettingLinks"
    || status === "linksObtained"
    || status === "gettingMarkdown";
}

export function shouldBackfillTextOrQa(entry: { status?: string }) {
  return !isKnowledgeBackfillBusy(entry.status);
}

export function shouldRerunParentWebsite(entry: {
  status?: string;
  parentId?: string;
}) {
  return !entry.parentId && !isKnowledgeBackfillBusy(entry.status);
}

export function shouldBackfillFile(entry: { status?: string }) {
  return !isKnowledgeBackfillBusy(entry.status);
}

export function shouldBackfillRow(
  table: KnowledgeBackfillTable,
  entry: { status?: string; parentId?: string },
) {
  if (table === "web") return shouldRerunParentWebsite(entry);
  return shouldBackfillTextOrQa(entry);
}
