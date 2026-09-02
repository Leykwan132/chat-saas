import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { workflowNodeDefaultCondition, workflowNodeDescription, workflowNodeTitle } from "../shared/workflows";
import { MAX_WORKFLOW_EDGES, MAX_WORKFLOW_NODES, listWorkflowEdges, listWorkflowNodes } from "./workflowCore";

export async function createInitialBookingWorkflowAction(
  ctx: MutationCtx,
  args: { workflowId: Id<"workflows">; serviceId: Id<"appointmentServices"> },
) {
  const nodes = await listWorkflowNodes(ctx, args.workflowId);
  if (nodes.length >= MAX_WORKFLOW_NODES) throw new Error("Workflow node limit reached");
  const startNode = nodes.find((node) => node.kind === "start");
  if (startNode === undefined) throw new Error("Workflow entry node not found");
  const edges = await listWorkflowEdges(ctx, args.workflowId);
  if (edges.length >= MAX_WORKFLOW_EDGES) throw new Error("Workflow edge limit reached");
  const now = Date.now();
  const condition = workflowNodeDefaultCondition("bookAppointment");
  const bookingNodeId = await ctx.db.insert("workflowNodes", {
    workflowId: args.workflowId,
    kind: "bookAppointment",
    title: workflowNodeTitle("bookAppointment"),
    description: workflowNodeDescription("bookAppointment"),
    allowedAppointmentServiceIds: [args.serviceId],
    isReady: false,
    positionX: startNode.positionX + 260,
    positionY: startNode.positionY + 140,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.insert("workflowEdges", {
    workflowId: args.workflowId,
    sourceNodeId: startNode._id,
    targetNodeId: bookingNodeId,
    label: condition?.label,
    detail: condition?.detail,
    createdAt: now,
    updatedAt: now,
  });
  return bookingNodeId;
}
