import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(
  new URL("./useWorkflowMessageActions.ts", import.meta.url),
  "utf8",
);

test("direct Add adopts the returned graph and selects its real node", () => {
  expect(source).toContain("api.workflows.addNodeAfter");
  expect(source).toContain("const nextGraph = await addNodeAfter({");
  expect(source).toContain("findNewWorkflowNodeId(");
  expect(source.indexOf("onGraph(nextGraph)")).toBeLessThan(
    source.indexOf("onSelectNode(addedNodeId)"),
  );
});

test("direct actions use focused atomic mutations", () => {
  expect(source).toContain("api.workflowNodeConfig.apply");
  expect(source).toContain("api.workflowLayout.apply");
  expect(source).toContain("api.workflows.removeNode");
  expect(source).toContain("api.workflows.connectNodes");
  expect(source).toContain("api.workflows.removeEdge");
});

test("Add uses one loading toast lifecycle", () => {
  expect(source).toContain("const toastId = toast.loading");
  expect(source).toContain("toast.success(");
  expect(source).toContain("{ id: toastId }");
  expect(source).toContain("toast.error(");
});
