export const WEBSITE_RESEARCH_PAID_PLAN_ERROR =
  "Website research is available on paid plans";

export function isWebEntryBusy(status?: string) {
  return status === "gettingLinks"
    || status === "linksObtained"
    || status === "gettingMarkdown"
    || status === "deleting";
}

export function requireResearchMarkdown(outputText: string | null | undefined) {
  const markdown = outputText?.trim();
  if (!markdown) {
    throw new Error("Perplexity returned no output");
  }
  return markdown;
}
