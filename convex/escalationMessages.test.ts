import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { createWorkflowPersistenceAgent, initWorkflowPersistenceTest } from "./workflowPersistence.testHelpers";

async function fixture() {
  const t = initWorkflowPersistenceTest();
  const agentId = await createWorkflowPersistenceAgent(t, "escalation-message-owner");
  const authed = t.withIdentity({ subject: "escalation-message-owner" });
  await authed.mutation(api.humanEscalationSettings.setEnabled, { agentId, enabled: true });
  const graph = await authed.query(api.workflows.getForAgent, { agentId });
  const nodeId = graph!.nodes.find((node) => node.kind === "humanEscalation")!._id;
  const conversationId = await t.run(async (ctx) => {
    const now = Date.now();
    const id = await ctx.db.insert("conversations", { orgId: "", service: "web", orgAddress: "web", contactAddress: "customer", assignedAgentId: agentId, status: "open", assignToAiAgent: true, threadId: "test", lastMessageAt: now, unreadCount: 0, createdAt: now, updatedAt: now });
    await ctx.db.insert("messages", { orgId: "", conversationId: id, service: "web", orgAddress: "web", contactAddress: "customer", direction: "incoming", contentType: "text", content: "Can a teammate help?", agentMessageId: "mode-source", createdAt: now });
    return id;
  });
  const policy = () => t.query(internal.escalationMessages.getPolicy, { conversationId, sourceAgentMessageId: "mode-source", workflowNodeId: nodeId });
  return { t, authed, agentId, nodeId, conversationId, policy };
}

test("AI-written mode does not require manual text and stays ready", async () => {
  const f = await fixture();
  await f.authed.mutation(api.workflowNodeCanvasControls.updateEscalationMessage, { agentId: f.agentId, nodeId: f.nodeId, enabled: true, mode: "ai", message: "" });
  expect(await f.policy()).toMatchObject({ mode: "ai", nodeId: f.nodeId });
  expect(await f.t.run((ctx) => ctx.db.get(f.nodeId))).toMatchObject({ isReady: true, escalationMessageMode: "ai" });
});

test("manual mode requires text, sends the saved text and preserves it across mode/off changes", async () => {
  const f = await fixture();
  const args = { agentId: f.agentId, nodeId: f.nodeId, enabled: true, message: "", mode: "manual" as const };
  await expect(f.authed.mutation(api.workflowNodeCanvasControls.updateEscalationMessage, args)).rejects.toThrow("required");
  await f.authed.mutation(api.workflowNodeCanvasControls.updateEscalationMessage, { ...args, message: " A teammate will help. " });
  expect(await f.policy()).toMatchObject({ mode: "manual", message: "A teammate will help." });
  await f.authed.mutation(api.workflowNodeCanvasControls.updateEscalationMessage, { ...args, mode: "ai", message: "A teammate will help." });
  await f.authed.mutation(api.workflowNodeCanvasControls.updateEscalationMessage, { ...args, enabled: false, mode: "ai", message: "A teammate will help." });
  expect(await f.policy()).toMatchObject({ mode: "ai" });
  expect((await f.t.run((ctx) => ctx.db.get(f.nodeId)))?.escalationMessage).toBe("A teammate will help.");
});

test("legacy message settings stay manual and unqualified handoffs use the sole rule", async () => {
  const f = await fixture();
  await f.authed.mutation(api.workflowNodeCanvasControls.updateEscalationMessage, { agentId: f.agentId, nodeId: f.nodeId, enabled: true, message: "Saved handoff" });
  expect(await f.t.query(internal.escalationMessages.getPolicy, { conversationId: f.conversationId, sourceAgentMessageId: "mode-source" })).toMatchObject({ mode: "manual", message: "Saved handoff" });
});

test("disabled escalation prevents message generation and sending", async () => {
  const f = await fixture();
  await f.authed.mutation(api.humanEscalationSettings.setEnabled, { agentId: f.agentId, enabled: false });
  expect(await f.policy()).toBeNull();
});

test("source messages and workflow nodes must belong to this conversation's agent", async () => {
  const f = await fixture();
  await expect(f.t.query(internal.escalationMessages.getPolicy, { conversationId: f.conversationId, sourceAgentMessageId: "missing", workflowNodeId: f.nodeId })).rejects.toThrow("source");
  const otherAgent = await createWorkflowPersistenceAgent(f.t, "other-message-owner");
  const otherAuth = f.t.withIdentity({ subject: "other-message-owner" });
  await otherAuth.mutation(api.humanEscalationSettings.setEnabled, { agentId: otherAgent, enabled: true });
  const otherGraph = await otherAuth.query(api.workflows.getForAgent, { agentId: otherAgent });
  const otherNode = otherGraph!.nodes.find((node) => node.kind === "humanEscalation")!;
  await expect(f.t.query(internal.escalationMessages.getPolicy, { conversationId: f.conversationId, sourceAgentMessageId: "mode-source", workflowNodeId: otherNode._id })).rejects.toThrow("not available");
});


test("custom message off defaults to AI-written and provides generation context", async () => {
  const f = await fixture();
  expect(await f.policy()).toMatchObject({ mode: "ai" });
  expect(await f.t.query(internal.escalationMessages.getGenerationInput, { conversationId: f.conversationId, sourceAgentMessageId: "mode-source", workflowNodeId: f.nodeId })).toMatchObject({ agentId: f.agentId, customerMessage: "Can a teammate help?" });
});
