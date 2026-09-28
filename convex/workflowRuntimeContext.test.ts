import { expect, test } from "vitest";
import type { Doc, Id } from "./_generated/dataModel";
import {
  getEscalationMessageForWorkflowNode,
  getReadyWorkflowGraph,
} from "./workflowRuntimeContext";

const startNodeId = "start-node" as Id<"workflowNodes">;
const readyNodeId = "ready-node" as Id<"workflowNodes">;
const unreadyNodeId = "unready-node" as Id<"workflowNodes">;

function workflowNode(
  id: Id<"workflowNodes">,
  isReady: boolean,
): Doc<"workflowNodes"> {
  return {
    _id: id,
    workflowId: "workflow" as Id<"workflows">,
    kind: "sendText",
    title: "Send message",
    isReady,
    positionX: 0,
    positionY: 0,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"workflowNodes">;
}

function workflowEdge(
  id: string,
  sourceNodeId: Id<"workflowNodes">,
  targetNodeId: Id<"workflowNodes">,
): Doc<"workflowEdges"> {
  return {
    _id: id as Id<"workflowEdges">,
    workflowId: "workflow" as Id<"workflows">,
    sourceNodeId,
    targetNodeId,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"workflowEdges">;
}

test("omits unready nodes and their dangling edges from runtime workflow context", () => {
  const graph = getReadyWorkflowGraph(
    [
      workflowNode(startNodeId, true),
      workflowNode(readyNodeId, true),
      workflowNode(unreadyNodeId, false),
    ],
    [
      workflowEdge("ready-edge", startNodeId, readyNodeId),
      workflowEdge("unready-edge", readyNodeId, unreadyNodeId),
    ],
  );

  expect(graph.nodes.map((node) => node._id)).toEqual([
    startNodeId,
    readyNodeId,
  ]);
  expect(graph.edges.map((edge) => edge._id)).toEqual(["ready-edge"]);
});

test("returns only an enabled Human escalation message for its matching node", () => {
  const context = {
    workflowId: "workflow" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "human-escalation" as Id<"workflowNodes">,
        kind: "humanEscalation",
        title: "Human escalation",
        escalationMessageEnabled: true,
        escalationMessage: "A teammate will be with you shortly.",
        incomingConditions: [],
        allowedServices: [],
        mediaAssets: [],
      },
      {
        nodeId: "silent-escalation" as Id<"workflowNodes">,
        kind: "humanEscalation",
        title: "Silent escalation",
        escalationMessageEnabled: false,
        escalationMessage: "This must not send.",
        incomingConditions: [],
        allowedServices: [],
        mediaAssets: [],
      },
    ],
  };

  expect(getEscalationMessageForWorkflowNode(context, "human-escalation")).toBe(
    "A teammate will be with you shortly.",
  );
  expect(
    getEscalationMessageForWorkflowNode(context, "silent-escalation"),
  ).toBeUndefined();
  expect(
    getEscalationMessageForWorkflowNode(context, "unknown-node"),
  ).toBeUndefined();
});
