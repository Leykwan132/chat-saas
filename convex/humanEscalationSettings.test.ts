import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { createWorkflowPersistenceAgent, initWorkflowPersistenceTest } from "./workflowPersistence.testHelpers";
import { workflowHasHumanEscalationNode } from "./workflowCore";

async function fixture() {
  const t = initWorkflowPersistenceTest();
  const agentId = await createWorkflowPersistenceAgent(t, "escalation-switch-owner");
  const authed = t.withIdentity({ subject: "escalation-switch-owner" });
  return { t, agentId, authed };
}

test("enabling creates one default rule and repeated enable preserves it", async () => {
  const { agentId, authed } = await fixture();
  await authed.mutation(api.humanEscalationSettings.setEnabled, { agentId, enabled: true });
  const graph = await authed.query(api.workflows.getForAgent, { agentId });
  expect(graph?.workflow.humanEscalationEnabled).toBe(true);
  expect(graph?.nodes.filter((node) => node.kind === "humanEscalation")).toHaveLength(1);
  await authed.mutation(api.humanEscalationSettings.setEnabled, { agentId, enabled: true });
  expect((await authed.query(api.workflows.getForAgent, { agentId }))?.nodes).toEqual(graph?.nodes);
});

test("disabling preserves the rules while blocking runtime, keywords and escalation persistence", async () => {
  const { t, agentId, authed } = await fixture();
  await authed.mutation(api.humanEscalationSettings.setEnabled, { agentId, enabled: true });
  const initial = await authed.query(api.workflows.getForAgent, { agentId });
  const rule = initial!.nodes.find((node) => node.kind === "humanEscalation")!;
  await authed.mutation(api.workflowEscalationKeywords.update, { agentId, nodeId: rule._id, enabled: true, keywords: ["human"] });
  const before = await authed.query(api.workflows.getForAgent, { agentId });
  await authed.mutation(api.humanEscalationSettings.setEnabled, { agentId, enabled: false });
  const disabled = await authed.query(api.workflows.getForAgent, { agentId });
  expect(disabled?.workflow.humanEscalationEnabled).toBe(false);
  expect(disabled?.nodes).toEqual(before?.nodes);
  expect(disabled?.edges).toEqual(before?.edges);
  expect(await t.run((ctx) => workflowHasHumanEscalationNode(ctx, disabled!.workflow._id))).toBe(false);
  const runtime = await t.query(internal.workflowRuntimeContext.loadForAgent, { agentId });
  expect(runtime?.nodes.some((node) => node.kind === "humanEscalation")).toBe(false);
  const conversationId = await t.run(async (ctx) => {
    const now = Date.now();
    const id = await ctx.db.insert("conversations", { orgId: "", service: "web", orgAddress: "web", contactAddress: "customer", assignedAgentId: agentId, status: "open", assignToAiAgent: true, threadId: "test", lastMessageAt: now, unreadCount: 0, createdAt: now, updatedAt: now });
    await ctx.db.insert("messages", { orgId: "", conversationId: id, service: "web", orgAddress: "web", contactAddress: "customer", direction: "incoming", contentType: "text", content: "human please", agentMessageId: "switch-source", createdAt: now });
    return id;
  });
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "switch-source" })).toBeNull();
  expect(await t.mutation(internal.chat.inbox.internalEscalateConversation, { conversationId, question: "human please", context: "test", sourceAgentMessageId: "switch-source" })).toBe(false);
  expect((await t.run((ctx) => ctx.db.get(conversationId)))?.escalation).toBeUndefined();
  await authed.mutation(api.humanEscalationSettings.setEnabled, { agentId, enabled: true });
  const restored = await authed.query(api.workflows.getForAgent, { agentId });
  expect(restored?.nodes).toEqual(before?.nodes);
  expect(restored?.edges).toEqual(before?.edges);
  expect(await t.run((ctx) => workflowHasHumanEscalationNode(ctx, restored!.workflow._id))).toBe(true);
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "switch-source" })).toMatchObject({ keyword: "human" });
});

test("the switch requires permission to manage the agent", async () => {
  const { t, agentId } = await fixture();
  await expect(t.mutation(api.humanEscalationSettings.setEnabled, { agentId, enabled: false })).rejects.toThrow();
});
