import { expect, test } from "vitest";
import { toWorkflowLayoutApplyArgs } from "./workflowLayoutPersistence";
import { getWorkflowCleanupPositions } from "../components/workflow/workflowLayout";
import { WORKFLOW_TEMPLATES } from "../components/workflow/workflowTemplates";

test("builds canonical persisted positions without canvas drag offsets", () => {
  const graph = WORKFLOW_TEMPLATES[0].graph;
  const result = toWorkflowLayoutApplyArgs(graph, "vertical");
  const expected = getWorkflowCleanupPositions(graph, "vertical");

  expect(result.layoutOrientation).toBe("vertical");
  expect(result.positions).toEqual(
    expected.map(({ nodeId, position }) => ({
      nodeId,
      positionX: position.x,
      positionY: position.y,
    })),
  );
});

test("uses rendered node measurements when building Cleanup positions", () => {
  const graph = WORKFLOW_TEMPLATES[0].graph;
  const actionNode = graph.nodes.find((node) => node.kind === "sendFile")!;
  const measurements = new Map([[actionNode._id, { width: 340, height: 320 }]]);
  const result = toWorkflowLayoutApplyArgs(graph, "vertical", measurements);
  const expected = getWorkflowCleanupPositions(graph, "vertical", measurements);

  expect(result.positions).toEqual(
    expected.map(({ nodeId, position }) => ({
      nodeId,
      positionX: position.x,
      positionY: position.y,
    })),
  );
});
