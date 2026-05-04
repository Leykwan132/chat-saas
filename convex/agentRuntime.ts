import { Agent, stepCountIs } from "@convex-dev/agent";
import { google } from "@ai-sdk/google";
import { components } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

export function buildConfiguredAgent(agent: Doc<"agents">) {
  return new Agent(components.agent, {
    name: agent.name,
    languageModel: google(agent.model),
    instructions: agent.systemPrompt,
    stopWhen: stepCountIs(6),
  });
}
