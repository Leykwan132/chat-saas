export const chatResponseFormattingBlock = `\n\n## Response Formatting
- For customer-facing emphasis, use exactly one asterisk at the start and one at the end, like *Luminar Residence*.
- Do not use double asterisks in customer-facing replies.
- Do not use Markdown tables in customer-facing replies. Tables render badly in WhatsApp.
- When comparing several items, use a short bullet list instead. Put the item name first, then the important details in the same bullet.
- Do not narrate internal steps, tool use, searches, context fetching, or knowledge base lookups. Start with the customer-facing answer.`;

function parseMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return null;
  const cells = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function isMarkdownTableSeparator(line: string) {
  const cells = parseMarkdownTableRow(line);
  return cells !== null && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

function formatMarkdownTableAsBullets(headers: string[], rows: string[][]) {
  return rows
    .map((row) => {
      const title = row[0]?.trim() || "Item";
      const details = headers
        .slice(1)
        .map((header, index) => {
          const value = row[index + 1]?.trim();
          if (!value) return null;
          const label = header.trim() || `Detail ${index + 1}`;
          return `${label}: ${value}`;
        })
        .filter((detail): detail is string => detail !== null);
      return details.length > 0 ? `- ${title}: ${details.join("; ")}` : `- ${title}`;
    })
    .join("\n");
}

function normalizeMarkdownTables(content: string) {
  const lines = content.split("\n");
  const normalized: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const headers = parseMarkdownTableRow(lines[index] ?? "");
    const separator = lines[index + 1] ?? "";
    if (headers !== null && isMarkdownTableSeparator(separator)) {
      const rows: string[][] = [];
      let rowIndex = index + 2;
      while (rowIndex < lines.length) {
        const row = parseMarkdownTableRow(lines[rowIndex] ?? "");
        if (row === null || isMarkdownTableSeparator(lines[rowIndex] ?? "")) break;
        rows.push(row);
        rowIndex += 1;
      }
      if (rows.length > 0) {
        normalized.push(formatMarkdownTableAsBullets(headers, rows));
        index = rowIndex;
        continue;
      }
    }
    normalized.push(lines[index] ?? "");
    index += 1;
  }

  return normalized.join("\n");
}

const internalNarrationStartPattern =
  /^(?:wait,?\s*)?(?:let me|let's|i(?:'ll| will| need to| should)|we need to)\s+(?:first\s+)?(?:check|fetch|look|look up|look into|search|review|find|see)\b/i;
const internalNarrationStatementPattern =
  /^(?:they(?:'|’)re asking|the user(?:'|’)s query|user asked|the customer is asking)\b/i;
const internalNarrationContextPattern =
  /\b(?:knowledge base|fetchcontext|fetch context|context lookup)\b/i;

function isInternalNarrationSentence(sentence: string) {
  const trimmed = sentence.trim();
  return (
    internalNarrationStartPattern.test(trimmed) ||
    internalNarrationStatementPattern.test(trimmed) ||
    (internalNarrationContextPattern.test(trimmed) &&
      /^(?:checking|searching|reviewing|looking|wait)\b/i.test(trimmed))
  );
}

function removeInternalSourcePhrases(line: string) {
  return line
    .replace(/\b(?:according to|based on|from)\s+(?:the\s+)?(?:knowledge base|context)\s*,?\s*/gi, "")
    .replace(/\b(?:the\s+)?knowledge base\s+(?:says|shows|mentions|indicates)\s+(?:that\s+)?/gi, "");
}

function removeInternalNarrationFromLine(line: string) {
  const sentences = line.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (sentences === null) return removeInternalSourcePhrases(line).trim();
  return removeInternalSourcePhrases(
    sentences.filter((sentence) => !isInternalNarrationSentence(sentence)).join(""),
  ).trim();
}

function removeInternalNarration(content: string) {
  return content
    .split("\n")
    .map(removeInternalNarrationFromLine)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeCustomerFacingResponseFormatting(content: string): string {
  return removeInternalNarration(normalizeMarkdownTables(content))
    .replace(/\*{2,3}([^*\n]+?)\*{2,3}/g, "*$1*")
    .replace(/_{2,3}([^_\n]+?)_{2,3}/g, "*$1*");
}
