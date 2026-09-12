import { describeImageForKnowledgeBase, isImageFileName } from "./imageText";

const PLAIN_TEXT_EXTENSIONS = new Set(["txt", "md", "csv", "json"]);

function fileExtension(fileName: string) {
  return fileName.trim().toLowerCase().split(".").pop() ?? "";
}

export async function textFromFileBytes(
  fileName: string,
  bytes: ArrayBuffer,
): Promise<string | undefined> {
  if (isImageFileName(fileName)) {
    return await describeImageForKnowledgeBase(fileName, bytes);
  }
  if (PLAIN_TEXT_EXTENSIONS.has(fileExtension(fileName))) {
    return new TextDecoder().decode(bytes).trim() || undefined;
  }
  return undefined;
}
