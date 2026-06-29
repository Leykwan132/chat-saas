export const chatResponseFormattingBlock = `\n\n## Response Formatting
- For customer-facing emphasis, use exactly one asterisk at the start and one at the end, like *Luminar Residence*.
- Do not use double asterisks in customer-facing replies.
- Do not use Markdown tables in customer-facing replies. Tables render badly in WhatsApp.
- When comparing several items, use a short bullet list instead. Put the item name first, then the important details in the same bullet.`;

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

export function normalizeCustomerFacingResponseFormatting(content: string): string {
  return normalizeMarkdownTables(content)
    .replace(/\*{2,3}([^*\n]+?)\*{2,3}/g, "*$1*")
    .replace(/_{2,3}([^_\n]+?)_{2,3}/g, "*$1*");
}
