import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(new URL("./WorkflowPage.tsx", import.meta.url), "utf8");

test("workflow page isolates automation drafts from direct graph actions", () => {
  expect(source).toContain("useWorkflowAutomationDraft(");
  expect(source).toContain("useWorkflowMessageActions({");
  expect(source).toContain("automations={automationDraft.automations}");
  expect(source).toContain("isDirty={automationDraft.isDirty}");
  expect(source).not.toContain("useWorkflowDraft");
  expect(source).not.toContain("workflowDraft.addNode");
  expect(source).not.toContain("workflowDraft.removeNode");
});

test("workflow page saves and discards only automation settings", () => {
  expect(source).toContain("api.workflowAutomationSave.save");
  expect(source).toContain("toWorkflowAutomationSavePayload(");
  expect(source).toContain("automationDraft.acceptSaved()");
  expect(source).toContain("automationDraft.reset()");
});

test("workflow page leaves manual node movement transient", () => {
  expect(source).not.toContain("onNodeMoved=");
  expect(source).toContain("onCleanup={(measurements) => void handleCleanup(measurements)}");
  expect(source).toContain("onArrange={() => void handleArrange()}");
});

test("workflow page selects the real node returned by direct Add", () => {
  expect(source).toContain("messageActions.addNode(nodeId, kind)");
  expect(source).toContain("onSelectNode: setSelectedNodeId");
});

test("workflow page previews templates in a dialog separate from the live canvas", () => {
  expect(source).toContain("createWorkflowTemplatePreview(");
  expect(source).toContain("<WorkflowTemplatePreviewDialog");
  expect(source).toContain("preview={templatePreview}");
  expect(source).toContain("workflowGraphToFlow(");
  expect(source).toContain("latestGraph,");
  expect(source).not.toContain("displayedGraph");
  expect(source).not.toContain("templatePreview={");
  expect(source).toContain("await messageActions.replaceTemplate(");
  expect(source).toContain("setTemplatePreview(undefined)");
});
