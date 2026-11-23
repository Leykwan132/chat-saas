import type { Citation } from "./citation-parser";

const sourceTypeLabels: Record<string, string> = {
  qa: "Q&A",
  file: "File",
  text: "Text",
  web: "Website",
};

export function citationLabel(citation: Citation): string | undefined {
  if (citation.sourceType && sourceTypeLabels[citation.sourceType]) {
    return sourceTypeLabels[citation.sourceType];
  }
  if (citation.url && URL.canParse(citation.url))
    return new URL(citation.url).hostname;
  return citation.title?.trim() || citation.description?.trim();
}
