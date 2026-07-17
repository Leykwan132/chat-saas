import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(
  new URL("./WorkflowTemplatePreviewDialog.tsx", import.meta.url),
  "utf8",
);

test("template preview uses a separate read-only dialog canvas", () => {
  expect(source).toContain("<Dialog");
  expect(source).toContain("<DialogTitle>");
  expect(source).toContain("Preview {preview.template.name}");
  expect(source).toContain("<ReactFlowProvider>");
  expect(source).toContain("nodesDraggable={false}");
  expect(source).toContain("nodesConnectable={false}");
  expect(source).toContain("elementsSelectable={false}");
  expect(source).toContain("deleteKeyCode={null}");
  expect(source).toContain("Replace Current");
  expect(source).toContain("Skip");
});

test("replacement pending state blocks every dismissal path", () => {
  expect(source).toContain("if (!open && !isReplacing) onSkip()");
  expect(source).toContain("if (isReplacing) event.preventDefault()");
  expect(source).toContain("showCloseButton={!isReplacing}");
  expect(source).toContain("disabled={isReplacing}");
});

test("preview uses nearly the full viewport and keeps node content readable", () => {
  expect(source).toContain("fitViewOptions={{ padding: 0.08 }}");
  expect(source).toContain("h-[92vh]");
  expect(source).toContain("w-[calc(100vw-2rem)]");
  expect(source).toContain("sm:!max-w-[calc(100vw-2rem)]");
  expect(source).toContain('variant="ghost"');
  expect(source).not.toContain('variant="outline"');
});
