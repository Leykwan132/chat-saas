import { describe, expect, it } from "vitest";
import { filePreviewKind } from "./knowledgeBaseFileText";

describe("filePreviewKind", () => {
  it("classifies uploaded files for the preview modal", () => {
    expect(filePreviewKind("photo.PNG")).toBe("image");
    expect(filePreviewKind("brochure.pdf")).toBe("pdf");
    expect(filePreviewKind("notes.md")).toBe("text");
  });
});
