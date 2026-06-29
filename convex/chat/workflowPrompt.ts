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

export type WorkflowRuntimeContextForPrompt = {
  workflowId: Id<"workflows">;
  nodes: Array<{
    nodeId: Id<"workflowNodes">;
    kind: string;
    title: string;
    goal?: string;
    notes?: string;
    incomingConditions: Array<{
      sourceNodeId: Id<"workflowNodes">;
      label?: string;
      detail?: string;
    }>;
    allowedServices: RuntimeService[];
  }>;
  edges: Array<{
    sourceNodeId: Id<"workflowNodes">;
    targetNodeId: Id<"workflowNodes">;
    label?: string;
    detail?: string;
  }>;
} | null;

function formatCondition(condition: {
  label?: string;
  detail?: string;
}) {
  const label = condition.label?.trim();
  const detail = condition.detail?.trim();
  if (label && detail) return `${label}: ${detail}`;
  return label || detail || "No explicit condition";
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
  if (context === null || context.nodes.length === 0) return "";

  const nodeSections = context.nodes
    .map((node, index) => {
      const incoming = node.incomingConditions.length === 0
        ? "- Incoming conditions: message enters here"
        : [
            "- Incoming conditions:",
            ...node.incomingConditions.map((condition) => `  - ${formatCondition(condition)}`),
          ].join("\n");
      const goal = node.goal ? `- Goal: ${node.goal}` : undefined;
      const notes = node.notes ? `- Notes: ${node.notes}` : undefined;
      const services = node.kind === "bookAppointment" ? formatServices(node.allowedServices) : undefined;
      return [
        `### ${index + 1}. ${node.title} (${node.kind})`,
        `- Node ID: ${node.nodeId}`,
        incoming,
        goal,
        notes,
        services,
      ].filter((line): line is string => line !== undefined).join("\n");
    })
    .join("\n\n");

  return `\n\n## Workflow Runtime
Use this workflow as the source of truth for what stage the conversation is in and what you should do next. Infer the active node each turn from the latest customer message, the message history, each node goal, and the incoming edge conditions. Do not store or invent a persistent conversation stage.

When a condition matches a node, follow that node's goal. If several nodes might match, choose the most specific condition. If no action node condition matches, continue with the normal support/sales response rules.

For Book appointment nodes, use only the Services listed on that node. Start a new booking only when the workflow conditions indicate Book appointment or when the customer explicitly asks to book. Reschedule and cancellation requests for an existing appointment may use the booking tools even if the current turn is about changing or cancelling rather than creating a new booking.
${buildServiceBoundaryRules()}

${nodeSections}`;
}
