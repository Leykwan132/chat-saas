import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { assertManageableAgent, normalizeAgentOrgId } from "./agentAccess";
import { getWorkflowForAgent } from "./workflowCore";
import type { WorkflowNodeKind } from "../shared/workflows";

export const MAX_NODE_MEDIA = 100;
export const MAX_AGENT_MEDIA = 500;

export const ALLOWED_WORKFLOW_PHOTO_VIDEO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/3gpp",
]);

export const ALLOWED_WORKFLOW_FILE_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
]);

export const WORKFLOW_MEDIA_NODE_KINDS = new Set<WorkflowNodeKind>([
  "sendImage",
  "sendFile",
]);

export type WorkflowMediaNodeKind = "sendImage" | "sendFile";

export type WorkflowMediaNode = Doc<"workflowNodes"> & {
  kind: WorkflowMediaNodeKind;
};

export type UploadReservation = {
  uploadId: Id<"mediaUploads">;
  orgId: string;
  userId: string;
  fileName: string;
};

type DbCtx = QueryCtx | MutationCtx;

export function isWorkflowMediaNodeKind(kind: WorkflowNodeKind): kind is WorkflowMediaNodeKind {
  return WORKFLOW_MEDIA_NODE_KINDS.has(kind);
}

export function isAllowedWorkflowMediaTypeForNode(
  nodeKind: WorkflowMediaNodeKind,
  mimeType: string,
) {
  return nodeKind === "sendImage"
    ? ALLOWED_WORKFLOW_PHOTO_VIDEO_TYPES.has(mimeType)
    : ALLOWED_WORKFLOW_FILE_TYPES.has(mimeType);
}

export function assertAllowedWorkflowMediaType(
  nodeKind: WorkflowMediaNodeKind,
  mimeType: string,
  fileName: string,
) {
  if (!isAllowedWorkflowMediaTypeForNode(nodeKind, mimeType)) {
    const allowed = nodeKind === "sendImage" ? "photo or video" : "file";
    throw new Error(`${fileName} is not a supported ${allowed} type`);
  }
}

export function isActiveWorkflowMedia(row: Doc<"mediaUploads">) {
  return row.status !== "deleting" && row.status !== "cancelled";
}

export function mediaBelongsToAgent(row: Doc<"mediaUploads">, agent: Doc<"agents">) {
  return (
    row.agentId === agent._id &&
    normalizeAgentOrgId(row.orgId) === normalizeAgentOrgId(agent.orgId)
  );
}

export async function requireSendMediaNode(
  ctx: DbCtx,
  agentId: Id<"agents">,
  nodeId: Id<"workflowNodes">,
): Promise<WorkflowMediaNode> {
  const node = await findSendMediaNode(ctx, agentId, nodeId);
  if (node === null) throw new Error("Workflow media node not found");
  return node;
}

export async function findSendMediaNode(
  ctx: DbCtx,
  agentId: Id<"agents">,
  nodeId: Id<"workflowNodes">,
): Promise<WorkflowMediaNode | null> {
  const workflow = await getWorkflowForAgent(ctx, agentId);
  if (workflow === null) throw new Error("Workflow not found");
  const node = await ctx.db.get(nodeId);
  if (node === null) return null;
  if (node.workflowId !== workflow._id || !isWorkflowMediaNodeKind(node.kind)) {
    throw new Error("Workflow media node not found");
  }
  return node as WorkflowMediaNode;
}

export function publicWorkflowMediaRow(row: Doc<"mediaUploads">) {
  return {
    _id: row._id,
    clientId: row.clientId,
    status: row.status,
    publicUrl: row.publicUrl,
    mediaType: row.mediaType,
    filename: row.filename,
    fileSize: row.fileSize,
    createdAt: row.createdAt,
  };
}

export async function listWorkflowNodeMediaRows(
  ctx: DbCtx,
  nodeId: Id<"workflowNodes">,
) {
  return await ctx.db
    .query("mediaUploads")
    .withIndex("by_workflowNodeId", (q) => q.eq("workflowNodeId", nodeId))
    .order("desc")
    .take(MAX_NODE_MEDIA);
}

export async function assertManageableSendMediaNode(
  ctx: DbCtx,
  agentId: Id<"agents">,
  nodeId: Id<"workflowNodes">,
) {
  const result = await assertManageableAgent(ctx, agentId);
  const node = await requireSendMediaNode(ctx, result.agent._id, nodeId);
  return { ...result, node };
}

export async function findManageableSendMediaNode(
  ctx: DbCtx,
  agentId: Id<"agents">,
  nodeId: Id<"workflowNodes">,
) {
  const result = await assertManageableAgent(ctx, agentId);
  const node = await findSendMediaNode(ctx, result.agent._id, nodeId);
  return { ...result, node };
}
