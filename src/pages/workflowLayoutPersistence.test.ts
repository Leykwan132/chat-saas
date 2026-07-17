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
