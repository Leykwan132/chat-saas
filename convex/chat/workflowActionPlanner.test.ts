import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  buildWorkflowActionPlannerSystemPrompt,
  buildWorkflowActionPlanReplyGuidance,
  resolveWorkflowActionPlanMedia,
  resolveWorkflowActionPlanText,
  shouldRunWorkflowActionPlanner,
  workflowActionPlanReplyPromptArgs,
  workflowActionPlanSchema,
} from "./workflowActionPlanner";
import { reconcileWorkflowActionPlan } from "./workflowActionExecution";

const workflowContext = {
  workflowId: "workflow-id" as Id<"workflows">,
  edges: [],
  nodes: [
    {
      nodeId: "video-node-id" as Id<"workflowNodes">,
      kind: "sendImage",
      title: "Send Type B video",
      incomingConditions: [{ sourceNodeId: "entry-node-id" as Id<"workflowNodes">, name: "Asked for Type B video" }],
      allowedServices: [],
      mediaAssets: [
        {
          clientId: "type-b-video",
          filename: "Arden Heights Type B.mp4",
          mediaType: "video/mp4",
          url: "https://cdn.example.com/type-b-video.mp4",
        },
      ],
    },
    {
      nodeId: "message-node-id" as Id<"workflowNodes">,
      kind: "sendText",
      title: "Send greeting",
      textToSend: "Welcome to Sena Residence.",
      incomingConditions: [],
      allowedServices: [],
      mediaAssets: [],
    },
  ],
};

const workflowFilenamePrivacyContext = {
  ...workflowContext,
  nodes: [
    {
      ...workflowContext.nodes[0]!,
      title: "Send Type A layout",
      mediaAssets: [
        {
          ...workflowContext.nodes[0]!.mediaAssets[0]!,
          filename: "Type_A_layout.jpg",
          mediaType: "image/jpeg",
        },
      ],
    },
  ],
};

test("runs when workflow has executable media or Send message actions", () => {
  expect(shouldRunWorkflowActionPlanner(null)).toBe(false);
  expect(shouldRunWorkflowActionPlanner({ ...workflowContext, nodes: [] })).toBe(false);
  expect(
    shouldRunWorkflowActionPlanner({
      ...workflowContext,
      nodes: [workflowContext.nodes[1]!],
    }),
  ).toBe(true);
  expect(shouldRunWorkflowActionPlanner(workflowContext)).toBe(true);
});

test("builds a planner prompt with definitive action payloads", () => {
  const prompt = buildWorkflowActionPlannerSystemPrompt(workflowContext);

  expect(prompt).toContain("structured workflow action planner");
  expect(prompt).toContain("mediaNodeIdsToSend");
  expect(prompt).toContain("video-node-id");
  expect(prompt).toContain("Arden Heights Type B.mp4");
  expect(prompt).toContain("Welcome to Sena Residence.");
  expect(prompt).toContain("will be sent automatically");
  expect(prompt).toContain("will be sent exactly as configured");
  expect(prompt).toContain("Do not return media URLs");
  expect(prompt).toContain(
    "responseGuidance must never include uploaded filenames",
  );
  expect(prompt).not.toContain("https://cdn.example.com/type-b-video.mp4");
});

test("validates planner output with a fixed schema", () => {
  const plan = workflowActionPlanSchema.parse({
    workflowMatches: [
      {
        matched: true,
        nodeId: "video-node-id",
        nodeKind: "sendImage",
        nodeTitle: "Send Type B video",
      },
    ],
    mediaNodeIdsToSend: ["video-node-id"],
    responseGuidance: "Tell the customer the Type B video is attached.",
  });

  expect(plan.mediaNodeIdsToSend).toEqual(["video-node-id"]);
  expect(() =>
    workflowActionPlanSchema.parse({
      workflowMatches: [],
      responseGuidance: "Missing media list.",
    }),
  ).toThrow();
});

test("pins structured workflow planning to a dedicated DeepSeek model", () => {
  const plannerPath = fileURLToPath(
    new URL("./workflowActionPlanner.ts", import.meta.url),
  );
  const plannerSource = readFileSync(plannerPath, "utf8");

  expect(plannerSource).toContain(
    'export const WORKFLOW_ACTION_PLANNER_MODEL = "deepseek/deepseek-v4-flash";',
  );
  expect(plannerSource).toContain(
    "model: openRouterModel(WORKFLOW_ACTION_PLANNER_MODEL)",
  );
});

test("describes each workflow action plan schema item", () => {
  const matchSchema = workflowActionPlanSchema.shape.workflowMatches.element;

  expect(workflowActionPlanSchema.shape.workflowMatches.description).toContain(
    "workflow action node",
  );
  expect(matchSchema.shape.matched.description).toContain("Always true");
  expect(matchSchema.shape.nodeId.description).toContain("exact Workflow Runtime node ID");
  expect(matchSchema.shape.nodeKind.description).toContain("kind");
  expect(matchSchema.shape.nodeTitle.description).toContain("title");
  expect(workflowActionPlanSchema.shape.mediaNodeIdsToSend.description).toContain(
    "Node IDs",
  );
  expect(workflowActionPlanSchema.shape.responseGuidance.description).toContain(
    "customer-visible reply",
  );
});

test("sends every matched media node even when the model omits its send id", () => {
  const mediaItems = resolveWorkflowActionPlanMedia(
    {
      workflowMatches: [
        {
          matched: true,
          nodeId: "video-node-id",
          nodeKind: "sendImage",
          nodeTitle: "Send Type B video",
        },
      ],
      mediaNodeIdsToSend: [],
      responseGuidance: "Send the video.",
    },
    workflowContext,
  );

  expect(mediaItems).toEqual([
    {
      nodeId: "video-node-id",
      url: "https://cdn.example.com/type-b-video.mp4",
      mediaType: "video/mp4",
    },
  ]);
});

test("reconciles matched media into the definitive send list", () => {
  const plan = reconcileWorkflowActionPlan(
    {
      workflowMatches: [
        {
          matched: true as const,
          nodeId: "video-node-id",
          nodeKind: "sendImage",
          nodeTitle: "Model supplied title",
        },
      ],
      mediaNodeIdsToSend: [],
      responseGuidance: "Send the video.",
    },
    workflowContext,
  );

  expect(plan.mediaNodeIdsToSend).toEqual(["video-node-id"]);
  expect(plan.workflowMatches[0]?.nodeTitle).toBe("Send Type B video");
});

test("resolves matched Send message text exactly as configured", () => {
  const text = resolveWorkflowActionPlanText(
    {
      workflowMatches: [
        {
          matched: true,
          nodeId: "message-node-id",
          nodeKind: "sendText",
          nodeTitle: "Send greeting",
        },
      ],
      mediaNodeIdsToSend: [],
      responseGuidance: "Send the configured greeting.",
    },
    workflowContext,
  );

  expect(text).toBe("Welcome to Sena Residence.");
});

test("builds final reply guidance with the exact media payload being sent", () => {
  const guidance = buildWorkflowActionPlanReplyGuidance(
    {
      workflowMatches: [
        {
          matched: true,
          nodeId: "video-node-id",
          nodeKind: "sendImage",
          nodeTitle: "Send Type A layout",
        },
      ],
      mediaNodeIdsToSend: [],
      responseGuidance: "Tell the customer the Type A layout is being sent.",
    },
    workflowFilenamePrivacyContext,
  );

  expect(guidance).toContain("Type A layout is being sent");
  expect(guidance).toContain("The backend is sending the selected workflow media now");
  expect(guidance).not.toContain("Type_A_layout.jpg");
  expect(guidance).toContain("Send Type A layout (image/jpeg)");
  expect(guidance).toContain(
    "Never mention uploaded filenames in customer-visible content",
  );
  expect(guidance).toContain("Do not ask whether the customer wants you to send it");
});

test("adds workflow action guidance as context without replacing the agent system prompt", () => {
  const promptArgs = workflowActionPlanReplyPromptArgs(
    { promptMessageId: "message-id" },
    {
      workflowMatches: [],
      mediaNodeIdsToSend: ["video-node-id"],
      responseGuidance: "Tell the customer the video is being sent now.",
    },
  );

  expect(promptArgs).toMatchObject({ promptMessageId: "message-id" });
  expect(promptArgs).not.toHaveProperty("system");
  expect(promptArgs.messages).toEqual([
    {
      role: "system",
      content: expect.stringContaining("video is being sent now"),
    },
  ]);
});

test("AI reply worker uses structured workflow planner before generating text", () => {
  const inboxPath = fileURLToPath(new URL("./inbox.ts", import.meta.url));
  const inboxSource = readFileSync(inboxPath, "utf8");

  expect(inboxSource).toContain("generateWorkflowActionPlan(");
  expect(inboxSource).toContain("resolveWorkflowActionPlanMedia(");
  expect(inboxSource).toContain("output: aiReplyStructuredOutput");
  expect(inboxSource).toContain("extractAiReplyOutputMedia(");
});

test("AI reply worker uses plain text when workflow planner returns an empty media plan", () => {
  const inboxPath = fileURLToPath(new URL("./inbox.ts", import.meta.url));
  const inboxSource = readFileSync(inboxPath, "utf8");

  expect(inboxSource).toContain("if (workflowActionPlan) {");
  expect(inboxSource).toContain("workflowActionPlanReplyPromptArgs(");
  expect(inboxSource).toContain("workflowRuntimeContext,");
  expect(inboxSource).toContain("cleanText = result.text.trim();");
  expect(inboxSource).toContain("replyMediaItems = [];");
});

test("AI reply worker sends matched Send message text exactly", () => {
  const inboxPath = fileURLToPath(new URL("./inbox.ts", import.meta.url));
  const inboxSource = readFileSync(inboxPath, "utf8");

  expect(inboxSource).toContain("resolveWorkflowActionPlanText(");
  expect(inboxSource).toContain("cleanText = plannedWorkflowText;");
});
