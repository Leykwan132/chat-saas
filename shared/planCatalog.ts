export type PlanKey = "free" | "starter" | "growth" | "business";
export type ComparisonPlanKey = PlanKey | "enterprise";

export type PlanFeatureFlags = {
  broadcasting: boolean;
  lead_tagging: boolean;
  conversation_summaries: boolean;
  follow_ups: boolean;
  thread_summary: boolean;
  sync_lead_labeling: boolean;
  auto_reply: boolean;
  custom_agents: boolean;
  agent_usage: boolean;
  team_analytics: boolean;
  topic_analytics: boolean;
};

export type PlanCatalogEntry = {
  name: string;
  priceMonthlyRm: number;
  priceAnnualRm?: number;
  period: "forever" | "mo";
  monthlyCredits: number;
  maxMembers: number;
  maxAgents: number | "unlimited";
  maxChannels: number | "unlimited";
  knowledgeBaseBytesPerAgent: number;
  /** Shown in onboarding cards and other plan pickers — edit here to update UI copy. */
  displayFeatures: string[];
  actionLabel: string;
  popular?: boolean;
  models: string[];
  platforms: string[];
  features: PlanFeatureFlags;
};

export type EnterprisePlanEntry = {
  id: "enterprise";
  name: string;
  priceMonthlyLabel: string;
  monthlyCreditsLabel: string;
  maxMembersLabel: string;
  maxAgentsLabel: string;
  maxChannelsLabel: string;
  knowledgeBaseLabel: string;
  actionLabel: string;
  accentLabel: string;
  features: Record<
    | "broadcasting"
    | "lead_tagging"
    | "conversation_summaries"
    | "follow_ups"
    | "ai_agent_customization"
    | "agent_usage"
    | "team_analytics"
    | "topic_analytics",
    boolean
  >;
  aiModelAccessLabel: string;
};

const KB = 1024;
const MB = 1024 * KB;

export const BASIC_LIMITED_MODELS_LABEL = "Basic models";
export const ADVANCED_MODELS_LABEL = "Advanced models";

export const ADVANCED_PLAN_MODELS = [
  "deepseek/deepseek-v4-flash",
  "google/gemini-3.1-flash-lite",
  "tencent/hy3-preview",
  "openai/gpt-oss-120b",
  "xiaomi/mimo-v2.5",
  "amazon/nova-micro-v1",
] as const;

export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "deepseek/deepseek-v4-flash": "DeepSeek V4 Flash",
  "google/gemini-3.1-flash-lite": "Google Gemini 3.1 Flash Lite",
  "amazon/nova-micro-v1": "Amazon Nova Micro",
  "tencent/hy3-preview": "Tencent HY3 Preview",
  "openai/gpt-oss-120b": "OpenAI GPT-OSS 120B",
  "xiaomi/mimo-v2.5": "Xiaomi MiMo V2.5",
};

export function getPlanModelDisplayNames(planId: PlanKey): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const modelId of PLAN_CATALOG[planId].models) {
    const name = MODEL_DISPLAY_NAMES[modelId] ?? modelId;
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  return names;
}

export function isBasicLimitedModelsLabel(label: string): boolean {
  return label === BASIC_LIMITED_MODELS_LABEL;
}

export function isAdvancedModelsLabel(label: string): boolean {
  return label === ADVANCED_MODELS_LABEL;
}

export function isPlanModelAccessLabel(label: string): boolean {
  return isBasicLimitedModelsLabel(label) || isAdvancedModelsLabel(label);
}

export const PLAN_CATALOG: Record<PlanKey, PlanCatalogEntry> = {
  free: {
    name: "Free",
    priceMonthlyRm: 0,
    period: "forever",
    monthlyCredits: 100,
    maxMembers: 1,
    maxAgents: 1,
    maxChannels: 1,
    knowledgeBaseBytesPerAgent: 400 * KB,
    displayFeatures: [
      "1 AI Agent",
      "100 credits / mo",
      "1 channel",
      "400KB per agent",
      BASIC_LIMITED_MODELS_LABEL,
      "Follow-ups",
      "Broadcast",
      "AI Workflows",
      "Basic Analytics",
    ],
    actionLabel: "Start for Free",
    models: ["deepseek/deepseek-v4-flash", "amazon/nova-micro-v1"],
    platforms: ["whatsapp", "instagram", "messenger", "web"],
    features: {
      broadcasting: true,
      lead_tagging: false,
      conversation_summaries: false,
      follow_ups: true,
      thread_summary: false,
      sync_lead_labeling: false,
      auto_reply: false,
      custom_agents: false,
      agent_usage: true,
      team_analytics: false,
      topic_analytics: false,
    },
  },
  starter: {
    name: "Starter",
    priceMonthlyRm: 149,
    priceAnnualRm: 1490,
    period: "mo",
    monthlyCredits: 1000,
    maxMembers: 5,
    maxAgents: 3,
    maxChannels: 2,
    knowledgeBaseBytesPerAgent: 5 * MB,
    displayFeatures: [
      "Everything in Free, plus:",
      "3 AI Agents",
      "1,000 credits / mo",
      "2 channels",
      "5MB per agent",
      ADVANCED_MODELS_LABEL,
      "Team analytics",
      "5 team members",
    ],
    actionLabel: "Get Starter",
    models: [...ADVANCED_PLAN_MODELS],
    platforms: ["whatsapp", "instagram", "messenger", "web"],
    features: {
      broadcasting: true,
      lead_tagging: true,
      conversation_summaries: true,
      follow_ups: true,
      thread_summary: true,
      sync_lead_labeling: true,
      auto_reply: false,
      custom_agents: false,
      agent_usage: true,
      team_analytics: true,
      topic_analytics: false,
    },
  },
  growth: {
    name: "Growth",
    priceMonthlyRm: 399,
    priceAnnualRm: 3990,
    period: "mo",
    monthlyCredits: 5000,
    maxMembers: 10,
    maxAgents: 10,
    maxChannels: 5,
    knowledgeBaseBytesPerAgent: 20 * MB,
    displayFeatures: [
      "Everything in Starter, plus:",
      "10 AI Agents",
      "5,000 credits / mo",
      "5 channels",
      "20MB per agent",
      "Advanced Analytics",
      "10 team members",
    ],
    actionLabel: "Get Growth",
    popular: true,
    models: [...ADVANCED_PLAN_MODELS],
    platforms: ["whatsapp", "instagram", "messenger", "web"],
    features: {
      broadcasting: true,
      lead_tagging: true,
      conversation_summaries: true,
      follow_ups: true,
      thread_summary: true,
      sync_lead_labeling: true,
      auto_reply: true,
      custom_agents: true,
      agent_usage: true,
      team_analytics: true,
      topic_analytics: true,
    },
  },
  business: {
    name: "Business",
    priceMonthlyRm: 899,
    priceAnnualRm: 8990,
    period: "mo",
    monthlyCredits: 15000,
    maxMembers: 25,
    maxAgents: 25,
    maxChannels: 15,
    knowledgeBaseBytesPerAgent: 40 * MB,
    displayFeatures: [
      "Everything in Growth, plus:",
      "25 AI Agents",
      "15,000 credits / mo",
      "15 channels",
      "40MB per agent",
      "25 team members",
    ],
    actionLabel: "Get Business",
    models: [...ADVANCED_PLAN_MODELS],
    platforms: ["whatsapp", "instagram", "messenger", "web"],
    features: {
      broadcasting: true,
      lead_tagging: true,
      conversation_summaries: true,
      follow_ups: true,
      thread_summary: true,
      sync_lead_labeling: true,
      auto_reply: true,
      custom_agents: true,
      agent_usage: true,
      team_analytics: true,
      topic_analytics: true,
    },
  },
};

export function getDefaultAnalyticsSection(_plan: PlanKey): "usage" {
  void _plan;
  return "usage";
}

export const PLAN_ORDER: PlanKey[] = ["free", "starter", "growth", "business"];
export const ADVANCED_ANALYTICS_MIN_PLAN: PlanKey = "growth";

export function isPlanAtLeast(planKey: PlanKey, minimumPlan: PlanKey): boolean {
  const planIndex = PLAN_ORDER.indexOf(planKey);
  const minimumIndex = PLAN_ORDER.indexOf(minimumPlan);
  return planIndex >= 0 && minimumIndex >= 0 && planIndex >= minimumIndex;
}

export function isAdvancedAnalyticsPlan(planKey: PlanKey): boolean {
  return isPlanAtLeast(planKey, ADVANCED_ANALYTICS_MIN_PLAN);
}

export const COMPARISON_PLAN_ORDER: ComparisonPlanKey[] = [
  "free",
  "starter",
  "growth",
  "business",
  "enterprise",
];

export const PLAN_KEY_FEATURE_HEADERS: Record<ComparisonPlanKey, string> = {
  free: "Included in Free:",
  starter: "All features in Free, plus:",
  growth: "All features in Starter, plus:",
  business: "All features in Growth, plus:",
  enterprise: "All features in Business, plus:",
};

const ENTERPRISE_KEY_FEATURES = [
  "Custom agents & credits",
  "Custom channels & knowledge base",
  "Priority support",
];

export function getPlanKeyFeatures(planId: ComparisonPlanKey): string[] {
  if (planId === "enterprise") {
    return ENTERPRISE_KEY_FEATURES;
  }

  return PLAN_CATALOG[planId].displayFeatures.filter(
    (feature) => !feature.startsWith("Everything in "),
  );
}

export const ENTERPRISE_PLAN: EnterprisePlanEntry = {
  id: "enterprise",
  name: "Enterprise",
  priceMonthlyLabel: "Custom",
  monthlyCreditsLabel: "Custom",
  maxMembersLabel: "Unlimited",
  maxAgentsLabel: "Custom",
  maxChannelsLabel: "Custom / Unlimited",
  knowledgeBaseLabel: "Custom",
  actionLabel: "Contact sales",
  accentLabel: "Enterprise",
  features: {
    broadcasting: true,
    lead_tagging: true,
    conversation_summaries: true,
    follow_ups: true,
    ai_agent_customization: true,
    agent_usage: true,
    team_analytics: true,
    topic_analytics: true,
  },
  aiModelAccessLabel: "Custom model access",
};

export const ENTERPRISE_PRICING_BANNER = {
  message: "Need more? Contact our sales.",
  actionLabel: "Contact sales",
};

export type BillingInterval = "monthly" | "annual";

export const ANNUAL_DISCOUNT_PERCENT = 20;

export const STRIPE_EXTRA_CREDITS_METADATA_TYPE = "extra_credits";
export const STRIPE_CREDITS_AMOUNT_METADATA_KEY = "creditsAmount";

export {
  EXTRA_CREDITS_PACK_NOTE,
  EXTRA_CREDITS_PACKS,
  EXTRA_CREDITS_PACKS_BY_ID,
  formatExtraCreditsPackPrice,
  getExtraCreditsPack,
  type ExtraCreditsPack,
  type ExtraCreditsPackId,
} from "./extraCreditsCatalog";

function formatAgentLimit(count: number | "unlimited"): string {
  if (count === "unlimited") return "Unlimited AI agents";
  return count === 1 ? "1 AI Agent" : `${count.toLocaleString()} AI Agents`;
}

function formatChannelLimit(count: number | "unlimited"): string {
  if (count === "unlimited") return "Unlimited channels";
  return count === 1 ? "1 channel" : `${count.toLocaleString()} channels`;
}

function getAiModelAccessLabel(planKey: PlanKey): string {
  return planKey === "free" ? BASIC_LIMITED_MODELS_LABEL : ADVANCED_MODELS_LABEL;
}

export function formatKnowledgeBaseLimit(bytes: number): string {
  if (bytes < MB) {
    return `${Math.round(bytes / KB).toLocaleString()}KB`;
  }
  return `${Math.round(bytes / MB).toLocaleString()}MB`;
}

export function formatKnowledgeBasePerAgentLimit(bytes: number): string {
  return `${formatKnowledgeBaseLimit(bytes)} per agent`;
}

export function isKnowledgeBaseLimitLabel(label: string): boolean {
  return /^[\d,]+(?:KB|MB)(?: per agent)?$/.test(label);
}

export const AUTO_LEAD_TAGGING_LABEL = "Auto lead tagging";
export const CHAT_SUMMARY_LABEL = "Chat summary";
export const BASIC_ANALYTICS_LABEL = "Basic Analytics";
export const AI_WORKFLOWS_LABEL = "AI Workflows";
export const TEAM_ANALYTICS_LABEL = "Team analytics";
export const TOPIC_ANALYTICS_LABEL = "Advanced Analytics";
export const ADVANCED_ANALYTICS_INCLUDES = [
  "Common Topic Detection",
  "Customer Sentiment",
] as const;
export const CREDITS_COMPARISON_LABEL = "Credits / mo";
export const CHANNELS_COMPARISON_LABEL = "Channels";

export const SUPPORTED_CHANNEL_DISPLAY_NAMES = [
  "WhatsApp",
  "Instagram",
  "Messenger",
] as const;

export const AI_TAGGED_PLAN_FEATURE_LABELS = [
  AUTO_LEAD_TAGGING_LABEL,
  CHAT_SUMMARY_LABEL,
  TOPIC_ANALYTICS_LABEL,
] as const;

export function isAiTaggedPlanFeature(label: string): boolean {
  return (AI_TAGGED_PLAN_FEATURE_LABELS as readonly string[]).includes(label);
}

export const AUTO_LEAD_TAGGING_HOVER_TITLE = "Auto lead tagging";
export const AUTO_LEAD_TAGGING_HOVER_DESCRIPTION =
  "Our AI will help to categorize into the following category:";

export const KNOWLEDGE_BASE_HOVER_TITLE = "Knowledge base";
export const KNOWLEDGE_BASE_HOVER_DESCRIPTION =
  "Storage for each AI agent's knowledge base — the documents, Q&A, files, and web content your agent uses to answer customer questions.";

export const CREDITS_HOVER_TITLE = "Credits";
export const CREDITS_HOVER_DESCRIPTION =
  "Your monthly credit quota refreshes each billing cycle. Usage depends on the model — different models deduct different credits per AI message.";

export const CHAT_SUMMARY_HOVER_TITLE = "Chat summary";
export const CHAT_SUMMARY_HOVER_DESCRIPTION =
  "One button generation for your chat summary.";

export const BASIC_ANALYTICS_HOVER_TITLE = "Basic Analytics";
export const BASIC_ANALYTICS_HOVER_DESCRIPTION =
  "It will record AI agent usage so you can track agent activity over time.";

export const CHANNELS_HOVER_TITLE = "Supported channels";
export const CHANNELS_HOVER_DESCRIPTION =
  "Each connected channel counts toward your plan limit.";

export const SUPPORTED_PLATFORM_HOVER_LABEL = "Supported Platform:";

export const ADVANCED_ANALYTICS_HOVER_TITLE = "Advanced Analytics";
export const ADVANCED_ANALYTICS_HOVER_DESCRIPTION =
  "AI-powered conversation insights to help you understand what customers talk about and how they feel.";

export function isAutoLeadTaggingLabel(label: string): boolean {
  return label === AUTO_LEAD_TAGGING_LABEL;
}

export function isChatSummaryLabel(label: string): boolean {
  return label === CHAT_SUMMARY_LABEL;
}

export function isTopicAnalyticsLabel(label: string): boolean {
  return label === TOPIC_ANALYTICS_LABEL;
}

export function isBasicAnalyticsLabel(label: string): boolean {
  return label === BASIC_ANALYTICS_LABEL;
}

export function isTeamAnalyticsLabel(label: string): boolean {
  return label === TEAM_ANALYTICS_LABEL;
}

export function isPlanCreditsLabel(label: string): boolean {
  return label === CREDITS_COMPARISON_LABEL || /^[\d,]+ credits \/ mo$/.test(label);
}

export function isChannelsComparisonLabel(label: string): boolean {
  return label === CHANNELS_COMPARISON_LABEL;
}

export function isChannelLimitLabel(label: string): boolean {
  return /\bchannels?$/.test(label) && !label.includes("credits");
}

export function isPlanFeatureDescriptionHoverLabel(label: string): boolean {
  return (
    isPlanCreditsLabel(label) ||
    isChatSummaryLabel(label) ||
    isBasicAnalyticsLabel(label)
  );
}

export function getPlanFeatureDescriptionHover(label: string): {
  title: string;
  description: string;
} | null {
  if (isPlanCreditsLabel(label)) {
    return { title: CREDITS_HOVER_TITLE, description: CREDITS_HOVER_DESCRIPTION };
  }
  if (isChatSummaryLabel(label)) {
    return { title: CHAT_SUMMARY_HOVER_TITLE, description: CHAT_SUMMARY_HOVER_DESCRIPTION };
  }
  if (isBasicAnalyticsLabel(label)) {
    return {
      title: BASIC_ANALYTICS_HOVER_TITLE,
      description: BASIC_ANALYTICS_HOVER_DESCRIPTION,
    };
  }
  return null;
}

export const FOLLOW_UPS_LABEL = "Follow-ups";
export const BROADCASTING_LABEL = "Broadcasting";

export const WHATSAPP_ONLY_CHANNEL_DISPLAY_NAMES = ["WhatsApp"] as const;

export const WHATSAPP_FEATURE_BILLING_HOVER_DESCRIPTION =
  "Message billing is handled by Meta — our platform does not charge on top.";

export const BROADCASTING_HOVER_TITLE = "Broadcasting";
export const BROADCASTING_HOVER_DESCRIPTION = WHATSAPP_FEATURE_BILLING_HOVER_DESCRIPTION;

export const FOLLOW_UPS_HOVER_TITLE = "Follow-ups";
export const FOLLOW_UPS_HOVER_DESCRIPTION = WHATSAPP_FEATURE_BILLING_HOVER_DESCRIPTION;

export function isBroadcastingLabel(label: string): boolean {
  return label === BROADCASTING_LABEL;
}

export function isFollowUpsLabel(label: string): boolean {
  return label === FOLLOW_UPS_LABEL;
}

export function isWhatsAppPlanFeatureLabel(label: string): boolean {
  return isBroadcastingLabel(label) || isFollowUpsLabel(label);
}

export function getWhatsAppPlanFeatureHover(label: string): {
  title: string;
  description: string;
} | null {
  if (isBroadcastingLabel(label)) {
    return { title: BROADCASTING_HOVER_TITLE, description: BROADCASTING_HOVER_DESCRIPTION };
  }
  if (isFollowUpsLabel(label)) {
    return { title: FOLLOW_UPS_HOVER_TITLE, description: FOLLOW_UPS_HOVER_DESCRIPTION };
  }
  return null;
}

/** Full feature bullets shown inside pricing cards — fixed row order for side-by-side comparison. */
export type PlanCardFeatureRow = {
  text: string;
  included: boolean;
};

type PlanFeatureGroupKey =
  | "channel_support"
  | "ai_agent"
  | "ai_features"
  | "analytics"
  | "team_support";

export const PLAN_FEATURE_GROUP_LABELS: Record<PlanFeatureGroupKey, string | null> = {
  channel_support: "Channel support",
  ai_agent: "AI agent",
  ai_features: "AI",
  analytics: "Analytics",
  team_support: "Team support",
};

const PLAN_FEATURE_GROUP_ORDER: PlanFeatureGroupKey[] = [
  "channel_support",
  "ai_agent",
  "ai_features",
  "analytics",
  "team_support",
];

type PlanFeatureRowSpec = {
  group: PlanFeatureGroupKey;
  comparisonLabel: string;
  getSelfServeCardRow: (planId: PlanKey) => PlanCardFeatureRow;
  getEnterpriseCardRow: () => PlanCardFeatureRow;
  getComparisonValue: (planId: PlanKey) => string | boolean;
};

function teamMemberCardRow(planId: PlanKey): PlanCardFeatureRow {
  if (planId === "free") {
    return { text: "Team members", included: false };
  }

  const plan = PLAN_CATALOG[planId];
  return {
    text: `${plan.maxMembers.toLocaleString()} team members`,
    included: true,
  };
}

/** Channel support → AI agent → flagship AI features → analytics → team. */
const PLAN_FEATURE_ROW_SPECS: PlanFeatureRowSpec[] = [
  {
    group: "channel_support",
    comparisonLabel: CHANNELS_COMPARISON_LABEL,
    getSelfServeCardRow: (planId) => ({
      text: formatChannelLimit(PLAN_CATALOG[planId].maxChannels),
      included: true,
    }),
    getEnterpriseCardRow: () => ({
      text: `${ENTERPRISE_PLAN.maxChannelsLabel} channels`,
      included: true,
    }),
    getComparisonValue: (planId) => {
      const { maxChannels } = PLAN_CATALOG[planId];
      return maxChannels === "unlimited" ? "Unlimited" : maxChannels.toLocaleString();
    },
  },
  {
    group: "channel_support",
    comparisonLabel: BROADCASTING_LABEL,
    getSelfServeCardRow: (planId) => ({
      text: BROADCASTING_LABEL,
      included: PLAN_CATALOG[planId].features.broadcasting,
    }),
    getEnterpriseCardRow: () => ({
      text: BROADCASTING_LABEL,
      included: true,
    }),
    getComparisonValue: (planId) => PLAN_CATALOG[planId].features.broadcasting,
  },
  {
    group: "channel_support",
    comparisonLabel: FOLLOW_UPS_LABEL,
    getSelfServeCardRow: (planId) => ({
      text: FOLLOW_UPS_LABEL,
      included: PLAN_CATALOG[planId].features.follow_ups,
    }),
    getEnterpriseCardRow: () => ({
      text: FOLLOW_UPS_LABEL,
      included: true,
    }),
    getComparisonValue: (planId) => PLAN_CATALOG[planId].features.follow_ups,
  },
  {
    group: "ai_agent",
    comparisonLabel: "AI agents",
    getSelfServeCardRow: (planId) => ({
      text: formatAgentLimit(PLAN_CATALOG[planId].maxAgents),
      included: true,
    }),
    getEnterpriseCardRow: () => ({
      text: `${ENTERPRISE_PLAN.maxAgentsLabel} AI agents`,
      included: true,
    }),
    getComparisonValue: (planId) => {
      const { maxAgents } = PLAN_CATALOG[planId];
      return maxAgents === "unlimited" ? "Unlimited" : maxAgents.toLocaleString();
    },
  },
  {
    group: "ai_agent",
    comparisonLabel: CREDITS_COMPARISON_LABEL,
    getSelfServeCardRow: (planId) => ({
      text: `${PLAN_CATALOG[planId].monthlyCredits.toLocaleString()} credits / mo`,
      included: true,
    }),
    getEnterpriseCardRow: () => ({
      text: `${ENTERPRISE_PLAN.monthlyCreditsLabel} credits / mo`,
      included: true,
    }),
    getComparisonValue: (planId) => PLAN_CATALOG[planId].monthlyCredits.toLocaleString(),
  },
  {
    group: "ai_agent",
    comparisonLabel: "Knowledge base",
    getSelfServeCardRow: (planId) => ({
      text: formatKnowledgeBasePerAgentLimit(
        PLAN_CATALOG[planId].knowledgeBaseBytesPerAgent,
      ),
      included: true,
    }),
    getEnterpriseCardRow: () => ({
      text: `${ENTERPRISE_PLAN.knowledgeBaseLabel} per agent`,
      included: true,
    }),
    getComparisonValue: (planId) =>
      formatKnowledgeBaseLimit(PLAN_CATALOG[planId].knowledgeBaseBytesPerAgent),
  },
  {
    group: "ai_agent",
    comparisonLabel: "AI models",
    getSelfServeCardRow: (planId) => ({
      text: getAiModelAccessLabel(planId),
      included: true,
    }),
    getEnterpriseCardRow: () => ({
      text: ENTERPRISE_PLAN.aiModelAccessLabel,
      included: true,
    }),
    getComparisonValue: (planId) => getAiModelAccessLabel(planId),
  },
  {
    group: "ai_agent",
    comparisonLabel: AI_WORKFLOWS_LABEL,
    getSelfServeCardRow: () => ({
      text: AI_WORKFLOWS_LABEL,
      included: true,
    }),
    getEnterpriseCardRow: () => ({
      text: AI_WORKFLOWS_LABEL,
      included: true,
    }),
    getComparisonValue: () => true,
  },
  {
    group: "ai_features",
    comparisonLabel: AUTO_LEAD_TAGGING_LABEL,
    getSelfServeCardRow: (planId) => ({
      text: AUTO_LEAD_TAGGING_LABEL,
      included: PLAN_CATALOG[planId].features.lead_tagging,
    }),
    getEnterpriseCardRow: () => ({
      text: AUTO_LEAD_TAGGING_LABEL,
      included: true,
    }),
    getComparisonValue: (planId) => PLAN_CATALOG[planId].features.lead_tagging,
  },
  {
    group: "ai_features",
    comparisonLabel: CHAT_SUMMARY_LABEL,
    getSelfServeCardRow: (planId) => ({
      text: CHAT_SUMMARY_LABEL,
      included: PLAN_CATALOG[planId].features.conversation_summaries,
    }),
    getEnterpriseCardRow: () => ({
      text: CHAT_SUMMARY_LABEL,
      included: true,
    }),
    getComparisonValue: (planId) =>
      PLAN_CATALOG[planId].features.conversation_summaries,
  },
  {
    group: "analytics",
    comparisonLabel: BASIC_ANALYTICS_LABEL,
    getSelfServeCardRow: (planId) => ({
      text: BASIC_ANALYTICS_LABEL,
      included: PLAN_CATALOG[planId].features.agent_usage,
    }),
    getEnterpriseCardRow: () => ({
      text: BASIC_ANALYTICS_LABEL,
      included: true,
    }),
    getComparisonValue: (planId) => PLAN_CATALOG[planId].features.agent_usage,
  },
  {
    group: "analytics",
    comparisonLabel: TEAM_ANALYTICS_LABEL,
    getSelfServeCardRow: (planId) => ({
      text: TEAM_ANALYTICS_LABEL,
      included: PLAN_CATALOG[planId].features.team_analytics,
    }),
    getEnterpriseCardRow: () => ({
      text: TEAM_ANALYTICS_LABEL,
      included: true,
    }),
    getComparisonValue: (planId) => PLAN_CATALOG[planId].features.team_analytics,
  },
  {
    group: "analytics",
    comparisonLabel: TOPIC_ANALYTICS_LABEL,
    getSelfServeCardRow: (planId) => ({
      text: TOPIC_ANALYTICS_LABEL,
      included: PLAN_CATALOG[planId].features.topic_analytics,
    }),
    getEnterpriseCardRow: () => ({
      text: TOPIC_ANALYTICS_LABEL,
      included: true,
    }),
    getComparisonValue: (planId) => PLAN_CATALOG[planId].features.topic_analytics,
  },
  {
    group: "team_support",
    comparisonLabel: "Team members",
    getSelfServeCardRow: teamMemberCardRow,
    getEnterpriseCardRow: () => ({
      text: `${ENTERPRISE_PLAN.maxMembersLabel} team members`,
      included: true,
    }),
    getComparisonValue: (planId) =>
      planId === "free"
        ? false
        : PLAN_CATALOG[planId].maxMembers.toLocaleString(),
  },
];

export function getAlignedPlanFeatureRows(planId: ComparisonPlanKey): PlanCardFeatureRow[] {
  if (planId === "enterprise") {
    return PLAN_FEATURE_ROW_SPECS.map((spec) => spec.getEnterpriseCardRow());
  }

  return PLAN_FEATURE_ROW_SPECS.map((spec) => spec.getSelfServeCardRow(planId));
}

export type PlanFeatureGroup = {
  title: string | null;
  rows: PlanCardFeatureRow[];
};

export function getGroupedPlanFeatureRows(planId: ComparisonPlanKey): PlanFeatureGroup[] {
  return PLAN_FEATURE_GROUP_ORDER.map((groupKey) => ({
    title: PLAN_FEATURE_GROUP_LABELS[groupKey],
    rows: PLAN_FEATURE_ROW_SPECS.filter((spec) => spec.group === groupKey).map((spec) =>
      planId === "enterprise"
        ? spec.getEnterpriseCardRow()
        : spec.getSelfServeCardRow(planId),
    ),
  }));
}

const ENTERPRISE_COLUMN_LIMIT_LABELS = new Set([
  CHANNELS_COMPARISON_LABEL,
  "AI agents",
  CREDITS_COMPARISON_LABEL,
  "Knowledge base",
  "AI models",
  "Team members",
]);

function getEnterpriseColumnLimitRowText(comparisonLabel: string): string {
  switch (comparisonLabel) {
    case CHANNELS_COMPARISON_LABEL:
      return formatChannelLimit("unlimited");
    case "AI agents":
      return formatAgentLimit("unlimited");
    case CREDITS_COMPARISON_LABEL:
      return "Unlimited credits / mo";
    case "Knowledge base":
      return "Unlimited per agent";
    case "AI models":
      return "Unlimited AI models";
    case "Team members":
      return "Unlimited";
    default:
      return "Unlimited";
  }
}

/** Enterprise plan-picker column: limits show what is unlimited; product features keep their labels. */
export function getEnterpriseColumnFeatureGroups(): PlanFeatureGroup[] {
  return PLAN_FEATURE_GROUP_ORDER.map((groupKey) => ({
    title: PLAN_FEATURE_GROUP_LABELS[groupKey],
    rows: PLAN_FEATURE_ROW_SPECS.filter((spec) => spec.group === groupKey).map((spec) =>
      ENTERPRISE_COLUMN_LIMIT_LABELS.has(spec.comparisonLabel)
        ? { text: getEnterpriseColumnLimitRowText(spec.comparisonLabel), included: true }
        : spec.getEnterpriseCardRow(),
    ),
  }));
}

/** @deprecated Use getAlignedPlanFeatureRows */
export function getPlanCardFeatures(planId: ComparisonPlanKey): string[] {
  return getAlignedPlanFeatureRows(planId)
    .filter((row) => row.included)
    .map((row) => row.text);
}

export type PlanComparisonRow = {
  label: string;
  values: Record<ComparisonPlanKey, string | boolean>;
};

export type PlanComparisonGroup = {
  title: string | null;
  rows: PlanComparisonRow[];
};

function getEnterpriseComparisonValue(spec: PlanFeatureRowSpec): string | boolean {
  if (ENTERPRISE_COLUMN_LIMIT_LABELS.has(spec.comparisonLabel)) {
    return getEnterpriseColumnLimitRowText(spec.comparisonLabel);
  }

  const enterpriseRow = spec.getEnterpriseCardRow();
  if (!enterpriseRow.included) {
    return false;
  }

  const sampleValue = spec.getComparisonValue("business");
  if (typeof sampleValue === "boolean") {
    return true;
  }

  return enterpriseRow.text;
}

function buildPlanComparisonRow(spec: PlanFeatureRowSpec): PlanComparisonRow {
  return {
    label: spec.comparisonLabel,
    values: Object.fromEntries(
      COMPARISON_PLAN_ORDER.map((planId) => [
        planId,
        planId === "enterprise"
          ? getEnterpriseComparisonValue(spec)
          : spec.getComparisonValue(planId),
      ]),
    ) as Record<ComparisonPlanKey, string | boolean>,
  };
}

export function getPlanComparisonRows(): PlanComparisonRow[] {
  return PLAN_FEATURE_ROW_SPECS.map((spec) => buildPlanComparisonRow(spec));
}

export function getGroupedPlanComparisonRows(): PlanComparisonGroup[] {
  return PLAN_FEATURE_GROUP_ORDER.map((groupKey) => ({
    title: PLAN_FEATURE_GROUP_LABELS[groupKey],
    rows: PLAN_FEATURE_ROW_SPECS.filter((spec) => spec.group === groupKey).map((spec) =>
      buildPlanComparisonRow(spec),
    ),
  }));
}


export function getComparisonPlanName(planId: ComparisonPlanKey): string {
  return planId === "enterprise" ? ENTERPRISE_PLAN.name : PLAN_CATALOG[planId].name;
}

export function getAnnualMonthlyEquivalent(priceMonthlyRm: number, priceAnnualRm?: number): number {
  if (priceAnnualRm !== undefined) {
    return Math.round(priceAnnualRm / 12);
  }
  return Math.round(priceMonthlyRm * (1 - ANNUAL_DISCOUNT_PERCENT / 100));
}

export function formatPlanPriceRm(priceMonthlyRm: number): string {
  return `RM ${priceMonthlyRm.toLocaleString()}`;
}

export function formatPlanPriceAmount(priceMonthlyRm: number): string {
  return priceMonthlyRm.toLocaleString();
}

export function formatPlanPriceLabel(entry: PlanCatalogEntry): string {
  return entry.period === "forever"
    ? "RM 0/mo"
    : `RM ${entry.priceMonthlyRm.toLocaleString()}/mo`;
}

export function comparePlans(
  currentPlanId: PlanKey,
  targetPlanId: PlanKey,
): "same" | "upgrade" | "downgrade" {
  const currentIndex = PLAN_ORDER.indexOf(currentPlanId);
  const targetIndex = PLAN_ORDER.indexOf(targetPlanId);
  if (currentIndex === targetIndex) return "same";
  return targetIndex > currentIndex ? "upgrade" : "downgrade";
}

/** Account plan picker: Upgrade / Downgrade / Current plan, or catalog label when no current plan. */
export function getPlanChangeActionLabel(
  currentPlanId: PlanKey | null | undefined,
  targetPlanId: PlanKey,
  fallbackLabel: string,
): string {
  if (!currentPlanId) return fallbackLabel;
  if (currentPlanId === targetPlanId) return "Current plan";
  const direction = comparePlans(currentPlanId, targetPlanId);
  if (direction === "upgrade") return "Upgrade";
  return "Downgrade";
}

type PlanPickerCardBase = {
  name: string;
  monthlyPriceRm: number;
  annualPriceRm: number;
  yearlyPriceRm?: number;
  period: PlanCatalogEntry["period"] | "mo";
  credits: string;
  featureSectionHeader: string;
  keyFeatures: string[];
  featureRows: PlanCardFeatureRow[];
  featureGroups: PlanFeatureGroup[];
  actionLabel: string;
  popular: boolean;
};

export type SelfServePlanPickerCard = PlanPickerCardBase & {
  id: PlanKey;
  isEnterprise?: false;
};

export type EnterprisePlanPickerCard = PlanPickerCardBase & {
  id: "enterprise";
  isEnterprise: true;
  customPriceLabel: string;
};

export type PlanPickerCard = SelfServePlanPickerCard | EnterprisePlanPickerCard;

/** @deprecated Use PlanPickerCard */
export type OnboardingPlanCard = PlanPickerCard;

function buildSelfServePlanCard(id: PlanKey): SelfServePlanPickerCard {
  const plan = PLAN_CATALOG[id];
  const isFree = id === "free";
  const monthlyRm = isFree ? 0 : plan.priceMonthlyRm;
  const annualRm = isFree ? 0 : getAnnualMonthlyEquivalent(plan.priceMonthlyRm, plan.priceAnnualRm);

  return {
    id,
    name: plan.name,
    monthlyPriceRm: monthlyRm,
    annualPriceRm: annualRm,
    yearlyPriceRm: plan.priceAnnualRm,
    period: isFree ? plan.period : "mo",
    credits: plan.monthlyCredits.toLocaleString(),
    featureSectionHeader: PLAN_KEY_FEATURE_HEADERS[id],
    keyFeatures: getPlanKeyFeatures(id),
    featureRows: getAlignedPlanFeatureRows(id),
    featureGroups: getGroupedPlanFeatureRows(id),
    actionLabel: plan.actionLabel,
    popular: plan.popular ?? false,
  };
}

function buildEnterprisePlanCard(): EnterprisePlanPickerCard {
  return {
    id: "enterprise",
    name: ENTERPRISE_PLAN.name,
    monthlyPriceRm: 0,
    annualPriceRm: 0,
    period: "mo",
    credits: ENTERPRISE_PLAN.monthlyCreditsLabel,
    featureSectionHeader: PLAN_KEY_FEATURE_HEADERS.enterprise,
    keyFeatures: getPlanKeyFeatures("enterprise"),
    featureRows: getAlignedPlanFeatureRows("enterprise"),
    featureGroups: getGroupedPlanFeatureRows("enterprise"),
    actionLabel: ENTERPRISE_PLAN.actionLabel,
    popular: false,
    isEnterprise: true,
    customPriceLabel: ENTERPRISE_PLAN.priceMonthlyLabel,
  };
}

export function getPlanPickerCards(options?: { includeEnterprise?: boolean }): PlanPickerCard[] {
  const cards: PlanPickerCard[] = PLAN_ORDER.map((id) => buildSelfServePlanCard(id));
  if (options?.includeEnterprise) {
    cards.push(buildEnterprisePlanCard());
  }
  return cards;
}

export function getOnboardingPlanCards(): PlanPickerCard[] {
  return getPlanPickerCards();
}
