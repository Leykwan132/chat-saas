const availabilityQuestionPattern = /\b(?:availability|available|slots?|openings?)\b|\b(?:what|which|when|any)\b[^?.!]{0,80}\b(?:times?|dates?)\b|\b(?:can|could|may)\s+i\s+(?:book|schedule)\b|\b(?:are|is)\s+(?:you|it|that)\s+(?:free|open|okay)\b|\bdo\s+you\s+have\s+anything\s+on\s+(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[^?.!]{0,40}\b(?:works?|okay)\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:work|works|okay)\b/i;

export function availabilityToolCallRequirement(args: {
  question: string | undefined;
  hasAvailabilityTool: boolean;
}): {
  activeTools: string[];
  toolChoice: { type: "tool"; toolName: string };
} | undefined {
  if (!args.hasAvailabilityTool || !args.question || !availabilityQuestionPattern.test(args.question)) {
    return undefined;
  }
  return {
    activeTools: ["checkAvailability"],
    toolChoice: { type: "tool", toolName: "checkAvailability" },
  };
}
