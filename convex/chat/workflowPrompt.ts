import type { Id } from "../_generated/dataModel";

type RuntimeService = {
  serviceId: Id<"appointmentServices">;
  name: string;
  description?: string;
  durationMinutes: number;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
  }>;
};

type RuntimeMediaAsset = {
  clientId: string;
  filename?: string;
  mediaType: string;
  url: string;
};

export type WorkflowRuntimeContextForPrompt = {
  workflowId: Id<"workflows">;
  nodes: Array<{
    nodeId: Id<"workflowNodes">;
    kind: string;
    title: string;
    goal?: string;
    textToSend?: string;
    notes?: string;
    incomingConditions: Array<{
      sourceNodeId: Id<"workflowNodes">;
      name?: string;
      detail?: string;
    }>;
    allowedServices: RuntimeService[];
    mediaAssets: RuntimeMediaAsset[];
  }>;
  edges: Array<{
    sourceNodeId: Id<"workflowNodes">;
    targetNodeId: Id<"workflowNodes">;
    name?: string;
    detail?: string;
  }>;
} | null;

function formatCondition(condition: {
  name?: string;
  detail?: string;
}) {
  const name = condition.name?.trim();
  const detail = condition.detail?.trim();
  if (name && detail) return `Name: ${name}; Detail: ${detail}`;
  if (name) return `Name: ${name}`;
  if (detail) return `Detail: ${detail}`;
  return "No explicit condition";
}

function formatServices(services: RuntimeService[]) {
  if (services.length === 0) return "- Allowed Services: none";
  return [
    "- Allowed Services:",
    ...services.map((service) => {
      const fields = service.fields
        .map((field) => `${field.label} (key: ${field.key})`)
        .join(", ");
      const description = service.description ? ` - ${service.description}` : "";
      return `  - ${service.name} (${service.durationMinutes} min, ID: ${service.serviceId})${description}. Required fields: ${fields}`;
    }),
  ].join("\n");
}

function formatMediaAssets(kind: string, mediaAssets: RuntimeMediaAsset[]) {
  const label = kind === "sendFile" ? "Files to send" : "Your Photos/Videos";
  if (mediaAssets.length === 0) return `- ${label}: none uploaded`;
  return [
    `- ${label}:`,
    ...mediaAssets.map((asset) => {
      const filename = asset.filename ? `, file: ${asset.filename}` : "";
      return `  - clientId: ${asset.clientId}${filename}, type: ${asset.mediaType}`;
    }),
  ].join("\n");
}

export function buildWorkflowBackendHandlingBlock() {
  return `\n\n## Workflow Handling
These rules apply regardless of the selected agent template.
Some actions are handled by workflows or backend systems, such as booking appointments, sending images, sending files, setting reminders, sending follow-ups, collecting payments, and external integrations.
Do not claim that an action was completed unless the workflow or system confirms it.
If the customer asks for something that requires a workflow action, collect only the required information and let the workflow handle the action.
If a workflow cannot complete successfully, apologize and escalate instead of pretending the action was completed.`;
}

export function buildWorkflowFinalResponseContractBlock(
  _context: WorkflowRuntimeContextForPrompt,
) {
  void _context;
  return "";
}

function buildServiceBoundaryRules() {
  return `\n\n## Service Booking Boundary
Services and knowledge-base context have different jobs:
- Services listed under a Book appointment node are the only bookable inventory. A customer can book only one of those listed Services by service ID.
- Knowledge-base results are supporting context only. They may explain services, symptoms, products, prices, policies, benefits, links, or terms customers use, but they never create an additional bookable Service.
- Use knowledge-base context to semantically match customer intent to the closest listed Service. Matching can use related terms, descriptions, links, procedures, outcomes, or customer phrasing; it does not need exact keyword overlap.
- If the customer's request is described in the knowledge base but no listed Service can reasonably fulfill it, answer the informational part from the knowledge base and do not offer to book it. If human escalation is available and booking intent remains unresolved, escalate.
- If a listed Service has a sparse description but knowledge-base context clearly explains that same service, use that context to guide the customer toward the listed Service. Start booking only with the listed Service's service ID.
- If multiple listed Services could fit, briefly explain the relevant options and ask the customer which one they want.
- Do not invent, rename, bundle, split, or imply availability for Services that are not listed under the active Book appointment node.`;
}

export function buildWorkflowRuntimeBlock(context: WorkflowRuntimeContextForPrompt) {
  const backendHandlingBlock = buildWorkflowBackendHandlingBlock();

  if (context === null || context.nodes.length === 0) return backendHandlingBlock;

  const nodeSections = context.nodes
    .map((node, index) => {
      const incoming = node.incomingConditions.length === 0
        ? "- Incoming conditions: message enters here"
        : [
            "- Incoming conditions:",
            ...node.incomingConditions.map((condition) => `  - ${formatCondition(condition)}`),
          ].join("\n");
      const isMediaNode = node.kind === "sendImage" || node.kind === "sendFile";
      const isBookAppointmentNode = node.kind === "bookAppointment";
      const goal = node.goal && !isMediaNode && !isBookAppointmentNode ? `- Goal: ${node.goal}` : undefined;
      const textToSend = node.kind === "sendText" && node.textToSend
        ? `- Exact text to send: ${node.textToSend}`
        : undefined;
      const notes = node.notes ? `- Notes: ${node.notes}` : undefined;
      const services = node.kind === "bookAppointment" ? formatServices(node.allowedServices) : undefined;
      const mediaAssets =
        isMediaNode
          ? formatMediaAssets(node.kind, node.mediaAssets)
          : undefined;
      return [
        `### ${index + 1}. ${node.title} (${node.kind})`,
        `- Node ID: ${node.nodeId}`,
        incoming,
        goal,
        textToSend,
        notes,
        services,
        mediaAssets,
      ].filter((line): line is string => line !== undefined).join("\n");
    })
    .join("\n\n");

  return `${backendHandlingBlock}\n\n## Workflow Runtime
Use this workflow as the source of truth for what stage the conversation is in and what you should do next.

### When to use workflow nodes
Infer active nodes each turn from the latest customer message, message history, each non-booking node goal, each Book appointment node's Services, each media node's assets to send, and incoming edge conditions. Do not store or invent a persistent conversation stage.
Multiple workflow node conditions can match in one turn. Follow every matching node; do not stop at the first match. If multiple conditions on the same node match, treat that node as matched once. If no action node condition matches, continue with the normal support/sales response rules.

### How to follow the workflow
1. Match the latest customer message against node goals, Book appointment Services, media assets, and incoming conditions.
2. Call \`fetchContext\` for customer-facing facts and wording.
3. Keep customer-visible text natural and brief.
4. Do not paste workflow metadata, media URLs, media client IDs, or internal action notes into the customer response.
5. Let the backend workflow planner handle reliable action metadata and media sending.

### Workflow guardrails
For Send message nodes, send the configured message when the incoming condition matches. Keep the response focused on that configured message unless the customer asks for a necessary clarification.

This is important: for Send Photo/Video and Send Files nodes, treat the media node as matched every time the customer asks for that media and the incoming condition matches, even if the same asset was sent earlier. Do not answer that the media was already sent. Do not paste media URLs or \`[MEDIA:...]\` markers in the customer response; the backend validates the matched workflow node and sends the assets separately.
For sendFile nodes, customer words such as brochure, PDF, document, file, catalog, menu, or attachment mean the matching file node should be used. Do not say "Here's the brochure", "I've attached the file", or similar unless the workflow node has an uploaded file listed under it.
Do not use tool calls for Send message, Q&A, booking, Send Photo/Video, Send Files, or custom action nodes.

For Human escalation nodes, call \`escalateToHuman\` when the incoming condition matches. Adding a Human escalation node enables human escalation mode for this workflow, so if you cannot answer safely or confidently while that node exists, escalate instead of guessing.

For Book appointment nodes, use only the Services listed on that node. Start a new booking only when the workflow conditions indicate Book appointment or when the customer explicitly asks to book. Reschedule and cancellation requests for an existing appointment may use the booking tools even if the current turn is about changing or cancelling rather than creating a new booking.
${buildServiceBoundaryRules()}

${nodeSections}`;
}
