import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { WorkflowNode } from "./WorkflowNode";

const sourcePath = fileURLToPath(
  new URL("./WorkflowNode.tsx", import.meta.url),
);
const source = readFileSync(sourcePath, "utf8");

function renderActionNode(kind: "sendText" | "start" | "end" = "sendText", disabled = false) {
  return renderToStaticMarkup(
    createElement(
      ReactFlowProvider,
      undefined,
      createElement(WorkflowNode, {
        id: "workflow-action-node",
        type: "workflow",
        selected: false,
        dragging: false,
        draggable: true,
        selectable: true,
        deletable: true,
        zIndex: 0,
        isConnectable: true,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        data: {
          nodeId: "workflow-action-node" as Id<"workflowNodes">,
          kind,
          title: "Send message",
          isReady: true,
          readinessIssueCount: 0,
          layoutOrientation: "horizontal",
          disabled,
          onAddNode: () => undefined,
          onRemoveNode: () => undefined,
        },
      }),
    ),
  );
}

test("workflow node handles switch between vertical and horizontal anchors", () => {
  expect(source).toContain("data.layoutOrientation");
  expect(source).toContain("targetPosition");
  expect(source).toContain("sourcePosition");
  expect(source).toContain("isVertical ? Position.Top : Position.Left");
  expect(source).toContain("isVertical ? Position.Bottom : Position.Right");
  expect(source).toContain("Position.Left");
  expect(source).toContain("Position.Right");
  expect(source).toContain("Position.Top");
  expect(source).toContain("Position.Bottom");
  expect(source).toContain("vertical");
});

test("workflow node card does not render landing demo service labels", () => {
  expect(source).not.toContain("serviceLabels");
});

test("workflow node shows an accessible bottom-left remaining-setup count only for incomplete actions", () => {
  expect(source).toContain("setup item remaining");
  expect(source).toContain("readinessIssueCount");
  expect(source).toContain('aria-label="Setup incomplete"');
  expect(source).toContain('data.kind !== "start"');
  expect(source).toContain("absolute left-0 top-full mt-1.5");

  const cardIndex = source.indexOf('"relative z-10 flex w-fit flex-col');
  const requirementIndex = source.indexOf('data.kind !== "start"');
  expect(cardIndex).toBeGreaterThan(-1);
  expect(requirementIndex).toBeGreaterThan(cardIndex);
});

test("workflow node compact density reduces the card and direct controls", () => {
  expect(source).toContain('const isCompact = data.density === "compact"');
  expect(source).toContain('"min-w-[150px] max-w-[255px]"');
  expect(source).toContain(
    '"min-h-[68px] min-w-[150px] max-w-[255px] gap-[5px] rounded-[10px] px-3.5 py-3"',
  );
  expect(source).toContain('"min-w-[187px]"');
  expect(source).toContain('"gap-2 text-sm"');
  expect(source).toContain('"size-7 rounded-md"');
  expect(source).toContain('"size-3.5"');
  expect(source).toContain('"text-[10px] leading-[1.35]"');
  expect(source).toContain('size={isCompact ? "icon-sm" : "icon"}');
});

test("workflow node standard density keeps the existing production classes", () => {
  expect(source).toContain('"min-w-[176px] max-w-[300px]"');
  expect(source).toContain(
    '"min-h-20 min-w-[176px] max-w-[300px] gap-1.5 rounded-xl px-4 py-3.5"',
  );
  expect(source).toContain('"min-w-[220px]"');
  expect(source).toContain('"gap-2.5 text-base"');
  expect(source).toContain('"size-8 rounded-lg"');
  expect(source).toContain('"text-xs leading-relaxed"');
});

test("workflow action nodes expose deletion without an add-node control", () => {
  const markup = renderActionNode();

  expect(markup).toContain("Delete node");
  expect(markup).not.toContain("Add workflow node");
});

test("message entry exposes node creation without deletion", () => {
  const markup = renderActionNode("start");

  expect(markup).toContain("Add workflow node");
  expect(markup).not.toContain("Delete node");
});

test("message entry disables node creation while the graph is mutating", () => {
  expect(renderActionNode("start", true)).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Add workflow node"/);
});

test("workflow end exposes neither node creation nor deletion", () => {
  const markup = renderActionNode("end");

  expect(markup).not.toContain("Add workflow node");
  expect(markup).not.toContain("Delete node");
});

test("workflow node only embeds direct controls for standard nodes with an agent", () => {
  expect(source).toContain("WorkflowNodeDirectControls");
  expect(source).toContain('data.density !== "compact"');
  expect(source).toContain("data.agentId !== undefined");
});
