import { expect, test } from "vitest";
import { knowledgeFileMimeType } from "./media/r2";

test("knowledge file previews retain Excel content types", () => {
  expect(knowledgeFileMimeType("pricing.xls")).toBe("application/vnd.ms-excel");
  expect(knowledgeFileMimeType("pricing.xlsx")).toBe(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
});
