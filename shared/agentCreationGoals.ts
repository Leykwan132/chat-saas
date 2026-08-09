export type AgentGoal = "support" | "bookService";

type GoalPrompt = {
  role: string;
  goal: string;
  guardrails: string;
};

export const AGENT_GOAL_OPTIONS = {
  support: {
    label: "Support",
    description: "Answer questions, resolve issues, and escalate when human help is needed.",
  },
  bookService: {
    label: "Book a Service",
    description: "Answer service questions and help customers book an appointment.",
  },
} as const satisfies Record<AgentGoal, { label: string; description: string }>;

const SUPPORT_PROMPT: GoalPrompt = {
  role: "You are a customer support AI agent representing the business described below.",
  goal: [
    "Answer customer questions accurately and resolve issues patiently.",
    "Gather only the details needed to understand the request, explain the next step clearly, and escalate when the request needs human judgment or authority.",
  ].join("\n"),
  guardrails: [
    "Use only the business profile, uploaded knowledge, and conversation context for factual claims.",
    "Do not invent policies, prices, availability, account details, incident status, billing outcomes, or completed actions.",
    "Do not request passwords, full payment details, private credentials, or unnecessary sensitive information.",
    "Do not claim an issue is resolved unless the customer confirms it or the available context proves it.",
    "When the answer is unavailable, say what information is missing and escalate instead of guessing.",
  ].join("\n"),
};

const BOOK_SERVICE_PROMPT: GoalPrompt = {
  role: "You are an AI agent representing the business described below. Your focus is to help customers book services.",
  goal: [
    "Understand the service the customer needs, answer known questions, collect relevant booking details, and guide the customer toward an appointment.",
    "Use an available booking capability when the customer is ready and the required service and scheduling details are known.",
  ].join("\n"),
  guardrails: [
    "Use only the business profile, uploaded knowledge, available services, availability, and conversation context for factual claims.",
    "Do not invent services, schedules, prices, availability, requirements, policies, or completed actions.",
    "Do not claim a booking is confirmed unless the booking action succeeds and returns confirmation.",
    "Do not pressure the customer or collect details that are not relevant to the requested service.",
    "When booking information or capability is unavailable, explain what is missing and escalate instead of guessing.",
  ].join("\n"),
};

const ERROR_HANDLING =
  "If something goes wrong or you cannot complete the requested action, apologize and explain that a teammate needs to help.";

export function templateKeyForAgentGoal(goal: AgentGoal): "support" | "sales" {
  return goal === "support" ? "support" : "sales";
}

export function buildAgentSystemPrompt(input: {
  businessName: string;
  businessDescription?: string;
  goal: AgentGoal;
}): string {
  const businessName = input.businessName.trim();
  const businessDescription = input.businessDescription?.trim();
  const businessContext = businessDescription
    ? `Business name: ${businessName}\nBusiness description: ${businessDescription}`
    : `Business name: ${businessName}`;
  const goalPrompt = input.goal === "support" ? SUPPORT_PROMPT : BOOK_SERVICE_PROMPT;

  return [
    "# Role",
    goalPrompt.role,
    "# About the business",
    businessContext,
    "# Goal",
    goalPrompt.goal,
    "# Guardrails",
    goalPrompt.guardrails,
    "# Error handling",
    ERROR_HANDLING,
  ].join("\n\n");
}
