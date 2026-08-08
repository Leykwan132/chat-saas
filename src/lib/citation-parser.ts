export interface Citation {
  number: string;
  title?: string;
  url?: string;
  description?: string;
  quote?: string;
}

interface ParsedCitationText {
  content: string;
  citations: Citation[];
}

const SOURCES_HEADER_REGEX = /(?:^|\n)\s*(?:#{1,3}\s+)?(?:\*\*)?(?:Sources?|References?|Citations?)[:*]?\s*(?:\*\*)?\s*(?:\n|$)/i;

export function stripInlineCitationMarkers(text: string): string {
  return text
    .replace(/[ \t]*\[\d+\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractFieldsFromBlock(blockText: string): Omit<Citation, "number"> {
  let title: string | undefined;
  let url: string | undefined;
  let description: string | undefined;

  const lines = blockText.split("\n");
  const firstLine = lines[0]?.trim() ?? "";

  // JSON-like format: {title: "...", url: "...", description: "..."}
  const jsonLike = blockText.match(/\{[^{}]+\}/);
  if (jsonLike) {
    const jsonStr = jsonLike[0];
    const titleMatch = jsonStr.match(/["']?title["']?\s*:\s*"([^"]*)"/i);
    const urlMatch = jsonStr.match(/["']?url["']?\s*:\s*"([^"]*)"/i);
    const descMatch = jsonStr.match(/["']?description["']?\s*:\s*"([^"]*)"/i);

    if (titleMatch?.[1]) title = titleMatch[1];
    if (urlMatch?.[1]) url = urlMatch[1];
    if (descMatch?.[1]) description = descMatch[1];
  }

  const boldOnFirst = firstLine.match(/\*\*(.+?)\*\*/);
  if (boldOnFirst) {
    title = boldOnFirst[1].trim();
  }

  const markdownUrl = blockText.match(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/);
  if (markdownUrl) {
    url = markdownUrl[1];
  }

  const backtickUrl = blockText.match(/`(https?:\/\/[^`]+)`/);
  if (backtickUrl) {
    url = backtickUrl[1];
  }

  if (!url) {
    const bareUrl = blockText.match(/(https?:\/\/[^\s)\]]+)/);
    if (bareUrl) {
      url = bareUrl[1];
    }
  }

  if (!description) {
    const descriptionLabel = blockText.match(
      /(?:^|[.\s])Description\s*:\s*(.+)$/im,
    );
    if (descriptionLabel?.[1]) {
      description = descriptionLabel[1].trim();
    }
  }

  const entries = blockText.match(/[*-]\s*(URL|Description|Quote|Title)\s*:\s*(.+)/gi);
  if (entries) {
    for (const entry of entries) {
      const match = entry.match(/[*-]\s*(URL|Description|Quote|Title)\s*:\s*(.+)/i);
      if (!match) continue;
      const key = match[1].toLowerCase();
      const value = match[2].trim();

      switch (key) {
        case "url":
          if (!url) url = value.replace(/`/g, "");
          break;
        case "description":
          description = value;
          break;
        case "quote":
          description ??= value;
          break;
        case "title":
          if (!title) title = value;
          break;
      }
    }
  }

  if (!title) {
    const boldAnywhere = blockText.match(/\*\*(.+?)\*\*/);
    if (boldAnywhere) {
      title = boldAnywhere[1].trim();
    }
  }

  if (!title && firstLine && !firstLine.match(/(URL|Description|Quote)\s*:/i)) {
    title = firstLine.replace(/^[*-]\s*/, "").trim();
  }

  if (!title) {
    const cleaned = firstLine
      .replace(/\[[^\]]*\]\(https?:\/\/[^)]+\)/g, "")
      .replace(/\bDescription\s*:.*$/i, "")
      .replace(/^[*-]\s*/, "")
      .trim();
    const named =
      cleaned.match(/^(.+?)\.?\s*\(n\.d\.\)/i)?.[1] ??
      cleaned.match(/^([^.|]+)/)?.[1];
    if (named?.trim()) title = named.trim().replace(/\.$/, "");
  }

  if (!description) {
    if (url) {
      const urlIndex = blockText.indexOf(url);
      if (urlIndex !== -1) {
        const afterUrl = blockText.slice(urlIndex + url.length).trim();
        const cleaned = afterUrl
          .replace(/^[\s\-–—]+/, "")
          .replace(/\n/g, " ")
          .trim();
        if (cleaned) {
          description = cleaned;
        }
      }
    }
  }

  if (!description) {
    const remainingLines = lines
      .filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        if (trimmed.match(/^\s*\d+[.)]/)) return false;
        if (trimmed.match(/^\s*\[\d+\]/)) return false;
        if (trimmed.match(/[*-]\s*(URL|Description|Quote|Title)\s*:/i)) return false;
        if (title && trimmed.includes(title)) return false;
        if (url && trimmed.includes(url)) return false;
        return true;
      })
      .map((line) => line.replace(/^[*-]\s*/, "").trim())
      .filter(Boolean);

    if (remainingLines.length > 0) {
      description = remainingLines.join(" ");
    }
  }

  return { title, url, description };
}

export function parseCitations(text: string): ParsedCitationText {
  const sourcesMatch = text.match(SOURCES_HEADER_REGEX);

  if (!sourcesMatch || !sourcesMatch.index) {
    return { content: text, citations: [] };
  }

  const mainContent = text.slice(0, sourcesMatch.index).trim();
  const sourcesSection = text.slice(sourcesMatch.index! + sourcesMatch[0].length);

  const blockRegex = /^\[?(\d+)[.\])]\s/gm;
  const blocks: { number: string; text: string }[] = [];
  const markers: { number: string; start: number; len: number }[] = [];

  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(sourcesSection)) !== null) {
    markers.push({ number: m[1], start: m.index, len: m[0].length });
  }

  for (let i = 0; i < markers.length; i++) {
    const contentStart = markers[i].start + markers[i].len;
    const contentEnd = i < markers.length - 1 ? markers[i + 1].start : sourcesSection.length;
    blocks.push({
      number: markers[i].number,
      text: sourcesSection.slice(contentStart, contentEnd).trim(),
    });
  }

  if (blocks.length === 0) {
    const lines = sourcesSection.split("\n");
    let currentNumber = "";
    let currentLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const lineMatch = trimmed.match(/^\[?(\d+)[.\])]\s/);
      if (lineMatch) {
        if (currentNumber && currentLines.length > 0) {
          blocks.push({ number: currentNumber, text: currentLines.join("\n").trim() });
        }
        currentNumber = lineMatch[1];
        currentLines = [trimmed.slice(lineMatch[0].length)];
      } else if (currentNumber) {
        currentLines.push(line);
      }
    }
    if (currentNumber && currentLines.length > 0) {
      blocks.push({ number: currentNumber, text: currentLines.join("\n").trim() });
    }
  }

  if (blocks.length === 0) {
    const objectMatches = sourcesSection.match(/\{[^{}]+\}/g) ?? [];
    for (const [index, objectText] of objectMatches.entries()) {
      blocks.push({
        number: String(index + 1),
        text: objectText.trim(),
      });
    }
  }

  const citations: Citation[] = blocks.map((block) => ({
    number: block.number,
    ...extractFieldsFromBlock(block.text),
  }));

  return {
    content: stripInlineCitationMarkers(mainContent),
    citations,
  };
}
