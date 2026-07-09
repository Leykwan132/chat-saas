import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  buildWorkflowActionPlannerSystemPrompt,
  buildWorkflowActionPlanReplyGuidance,
  resolveWorkflowActionPlanMedia,
  shouldRunWorkflowActionPlanner,
  workflowActionPlanReplyPromptArgs,
  workflowActionPlanSchema,
} from "./workflowActionPlanner";

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
      incomingConditions: [],
      allowedServices: [],
      mediaAssets: [],
    },
  ],
};

test("runs only when workflow has media assets to plan", () => {
  expect(shouldRunWorkflowActionPlanner(null)).toBe(false);
  expect(shouldRunWorkflowActionPlanner({ ...workflowContext, nodes: [] })).toBe(false);
  expect(shouldRunWorkflowActionPlanner(workflowContext)).toBe(true);
});

test("builds a planner prompt that asks for node ids instead of media urls", () => {
  const prompt = buildWorkflowActionPlannerSystemPrompt(workflowContext);

  expect(prompt).toContain("structured workflow action planner");
  expect(prompt).toContain("mediaNodeIdsToSend");
  expect(prompt).toContain("video-node-id");
  expect(prompt).toContain("Arden Heights Type B.mp4");
  expect(prompt).toContain("Do not return media URLs");
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

test("describes each workflow action plan schema item", () => {
  const matchSchema = workflowActionPlanSchema.shape.workflowMatches.element;

  expect(workflowActionPlanSchema.shape.workflowMatches.description).toContain(
    "matching workflow media node",
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

test("resolves planner media ids through backend workflow context", () => {
  const mediaItems = resolveWorkflowActionPlanMedia(
    {
      workflowMatches: [],
      mediaNodeIdsToSend: ["message-node-id", "unknown-node-id", "video-node-id"],
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

test("builds final reply guidance that treats selected workflow media as already sending", () => {
  const guidance = buildWorkflowActionPlanReplyGuidance({
    workflowMatches: [
      {
        matched: true,
        nodeId: "type-a-node-id",
        nodeKind: "sendImage",
        nodeTitle: "Send Sena Residence Type A Layout",
      },
      {
        matched: true,
        nodeId: "type-b-node-id",
        nodeKind: "sendImage",
        nodeTitle: "Send Sena Residence Layout B",
      },
    ],
    mediaNodeIdsToSend: ["type-a-node-id"],
    responseGuidance: "Here's the Sena Residence Type A Layout photo.",
  });

  expect(guidance).toContain("Here's the Sena Residence Type A Layout photo.");
  expect(guidance).toContain("The backend is sending the selected workflow media now");
  expect(guidance).toContain("Send Sena Residence Type A Layout");
  expect(guidance).toContain("Do not ask whether the customer wants you to send it");
  expect(guidance).toContain("Do not say selected-but-unsent workflow matches are being sent");
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
  expect(inboxSource).toContain(
    "workflowActionPlanReplyPromptArgs(args, workflowActionPlan)",
  );
  expect(inboxSource).toContain("cleanText = result.text.trim();");
  expect(inboxSource).toContain("replyMediaItems = [];");
});
