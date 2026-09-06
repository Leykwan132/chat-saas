import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, vi } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  buildWorkflowActionPlannerSystemPrompt,
  buildWorkflowActionPlanReplyGuidance,
  hasWorkflowActionMatches,
  resolveWorkflowActionPlanMedia,
  resolveWorkflowActionPlanText,
  retryWorkflowActionPlanGeneration,
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
  expect(prompt).toContain("Do not decide or describe the customer-visible reply");
  expect(prompt).toContain("Do not make factual claims about bookings");
  expect(prompt).toContain("responseLanguage");
  expect(prompt).toContain(
    "Detect the language of the latest user message and set responseLanguage",
  );
  expect(prompt).toContain("Example outputs");
  expect(prompt).toContain('"mediaNodeIdsToSend": ["jn7abc123"]');
  expect(prompt).toContain('"workflowMatches": []');
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
    responseLanguage: "English",
  });

  expect(plan.mediaNodeIdsToSend).toEqual(["video-node-id"]);
  expect(plan.responseLanguage).toBe("English");
  expect(() =>
    workflowActionPlanSchema.parse({
      workflowMatches: [],
      responseLanguage: "English",
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

test("retries malformed structured output up to the configured limit", async () => {
  const malformedOutputError = Object.defineProperty(
    new Error("could not parse the response"),
    Symbol.for("vercel.ai.error.AI_NoObjectGeneratedError"),
    { value: true },
  );
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

  try {
    let successfulAttempts = 0;
    const result = await retryWorkflowActionPlanGeneration(async () => {
      successfulAttempts += 1;
      if (successfulAttempts < 3) throw malformedOutputError;
      return "valid plan";
    }, 2);

    expect(result).toBe("valid plan");
    expect(successfulAttempts).toBe(3);

    let exhaustedAttempts = 0;
    await expect(
      retryWorkflowActionPlanGeneration(async () => {
        exhaustedAttempts += 1;
        throw malformedOutputError;
      }, 2),
    ).rejects.toBe(malformedOutputError);
    expect(exhaustedAttempts).toBe(3);
  } finally {
    warning.mockRestore();
  }
});

test("does not retry unrelated planner failures", async () => {
  let attempts = 0;
  const providerError = new Error("provider rejected request");

  await expect(
    retryWorkflowActionPlanGeneration(async () => {
      attempts += 1;
      throw providerError;
    }),
  ).rejects.toBe(providerError);
  expect(attempts).toBe(1);
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
  expect(workflowActionPlanSchema.shape.responseLanguage.description).toContain(
    "latest user message",
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
      responseLanguage: "English",
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
      responseLanguage: "English",
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
      responseLanguage: "English",
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
      responseLanguage: "English",
    },
    workflowFilenamePrivacyContext,
  );

  expect(guidance).toContain("You must respond in English strictly.");
  expect(guidance).toContain("The backend is sending the selected workflow media now");
  expect(guidance).not.toContain("Type_A_layout.jpg");
  expect(guidance).toContain("Send Type A layout (image/jpeg)");
  expect(guidance).toContain(
    "Never mention uploaded filenames in customer-visible content",
  );
  expect(guidance).toContain("Do not ask whether the customer wants you to send it");
});

test("final reply guidance requires the planner-detected response language", () => {
  const guidance = buildWorkflowActionPlanReplyGuidance(
    {
      workflowMatches: [],
      mediaNodeIdsToSend: [],
      responseLanguage: "Chinese",
    },
    workflowContext,
  );

  expect(guidance).toContain("You must respond in Chinese strictly.");
  expect(guidance).toContain("No workflow media is being sent in this turn.");
});

test("adds workflow action constraints as context without replacing the agent system prompt", () => {
  const promptArgs = workflowActionPlanReplyPromptArgs(
    { promptMessageId: "message-id" },
    {
      workflowMatches: [],
      mediaNodeIdsToSend: ["video-node-id"],
      responseLanguage: "English",
    },
  );

  expect(promptArgs).toMatchObject({ promptMessageId: "message-id" });
  expect(promptArgs).not.toHaveProperty("system");
  expect(promptArgs.messages).toEqual([
    {
      role: "system",
      content: expect.stringContaining("No workflow media is being sent in this turn"),
    },
  ]);
});

test("builds a language-only planner prompt when no workflow actions exist", () => {
  const prompt = buildWorkflowActionPlannerSystemPrompt(null);

  expect(prompt).toContain("structured reply planner");
  expect(prompt).toContain("workflowMatches: always []");
  expect(prompt).toContain("responseLanguage");
  expect(prompt).toContain(
    "Detect the language of the latest user message and set responseLanguage",
  );
  expect(prompt).toContain("Example outputs");
  expect(prompt).toContain('"workflowMatches": []');
  expect(prompt).not.toContain("Workflow action nodes and definitive payloads");
});

test("hasWorkflowActionMatches requires non-empty workflowMatches", () => {
  expect(
    hasWorkflowActionMatches({
      workflowMatches: [],
      mediaNodeIdsToSend: [],
      responseLanguage: "English",
    }),
  ).toBe(false);
  expect(
    hasWorkflowActionMatches({
      workflowMatches: [
        {
          matched: true,
          nodeId: "video-node-id",
          nodeKind: "sendImage",
          nodeTitle: "Send Type B video",
        },
      ],
      mediaNodeIdsToSend: ["video-node-id"],
      responseLanguage: "English",
    }),
  ).toBe(true);
});

test("AI reply worker always runs the planner and injects language into generated replies", () => {
  const inboxPath = fileURLToPath(new URL("./inbox.ts", import.meta.url));
  const inboxSource = readFileSync(inboxPath, "utf8");
  const plannerPath = fileURLToPath(
    new URL("./workflowActionPlanner.ts", import.meta.url),
  );
  const plannerSource = readFileSync(plannerPath, "utf8");

  expect(inboxSource).toContain("generateWorkflowActionPlan(");
  expect(inboxSource).toContain("hasWorkflowActionMatches(");
  expect(inboxSource).toContain("resolveWorkflowActionPlanMedia(");
  expect(inboxSource).toContain("if (hasMatches && plannedWorkflowText !== null)");
  expect(inboxSource).toContain("workflowActionPlanReplyPromptArgs(");
  expect(inboxSource).toContain("const allMediaItems = plannedMediaItems");
  expect(inboxSource).toContain(
    "replyMessages = splitAiReplyMessages(result.text);",
  );
  expect(inboxSource).not.toContain("aiReplyStructuredOutput");
  expect(inboxSource).not.toContain("extractAiReplyOutputMedia(");
  expect(inboxSource).not.toContain("replyMediaItems");
  expect(plannerSource).not.toContain("shouldRunWorkflowActionPlanner(workflowRuntimeContext)");
});

test("AI reply worker sends matched Send message text exactly", () => {
  const inboxPath = fileURLToPath(new URL("./inbox.ts", import.meta.url));
  const inboxSource = readFileSync(inboxPath, "utf8");

  expect(inboxSource).toContain("resolveWorkflowActionPlanText(");
  expect(inboxSource).toContain("replyMessages = [plannedWorkflowText];");
});
