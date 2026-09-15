import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";
import {
  extractKnowledgeBaseFileText,
  filePreviewKind,
  RAG_UPLOAD_EXTENSIONS,
} from "./knowledgeBaseFileText";

describe("filePreviewKind", () => {
  it("classifies uploaded files for the preview modal", () => {
    expect(filePreviewKind("photo.PNG")).toBe("image");
    expect(filePreviewKind("brochure.pdf")).toBe("pdf");
    expect(filePreviewKind("notes.md")).toBe("text");
  });
});

describe("RAG_UPLOAD_EXTENSIONS", () => {
  it("accepts JSON and Excel knowledge files", () => {
    expect(RAG_UPLOAD_EXTENSIONS).toContain("json");
    expect(RAG_UPLOAD_EXTENSIONS).toContain("xls");
    expect(RAG_UPLOAD_EXTENSIONS).toContain("xlsx");
  });
});

describe("extractKnowledgeBaseFileText", () => {
  it("extracts all worksheets from an Excel upload", async () => {
    const workbook = utils.book_new();
    utils.book_append_sheet(
      workbook,
      utils.aoa_to_sheet([["Product", "Price"], ["Support plan", 99]]),
      "Pricing",
    );
    utils.book_append_sheet(
      workbook,
      utils.aoa_to_sheet([["Region", "Hours"], ["Malaysia", "9-5"]]),
      "Availability",
    );
    const file = new File(
      [write(workbook, { bookType: "xlsx", type: "array" })],
      "agent-data.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );

    await expect(extractKnowledgeBaseFileText(file)).resolves.toContain(
      "Pricing\nProduct,Price\nSupport plan,99",
    );
    await expect(extractKnowledgeBaseFileText(file)).resolves.toContain(
      "Availability\nRegion,Hours\nMalaysia,9-5",
    );
  });
});
