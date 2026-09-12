export const PLAIN_TEXT_EXTENSIONS = ["txt", "md", "csv", "json"] as const;
export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"] as const;
export const RAG_UPLOAD_EXTENSIONS = ["pdf", ...PLAIN_TEXT_EXTENSIONS, ...IMAGE_EXTENSIONS];

export function fileExtension(fileName: string) {
  return fileName.trim().toLowerCase().split(".").pop() ?? "";
}

export function isPlainTextFile(fileName: string) {
  return (PLAIN_TEXT_EXTENSIONS as readonly string[]).includes(fileExtension(fileName));
}

export function isImageFile(fileName: string) {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(fileExtension(fileName));
}

export function filePreviewKind(fileName: string) {
  if (isImageFile(fileName)) return "image" as const;
  if (fileExtension(fileName) === "pdf") return "pdf" as const;
  return "text" as const;
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = (
    await import("pdfjs-dist/build/pdf.worker.mjs?url")
  ).default;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }
  await pdf.cleanup();
  return pages.filter(Boolean).join("\n\n");
}

export async function extractKnowledgeBaseFileText(file: File): Promise<string | undefined> {
  if (isImageFile(file.name)) return undefined;
  if (isPlainTextFile(file.name)) return (await file.text()).trim();
  if (fileExtension(file.name) === "pdf") {
    const text = (await extractPdfText(file)).trim();
    if (!text) {
      throw new Error(`${file.name} has no selectable text. Export a text-based PDF and retry.`);
    }
    return text;
  }
  throw new Error(`${file.name} is not a supported file type`);
}
