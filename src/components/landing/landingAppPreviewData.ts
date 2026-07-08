export type LandingPreviewSectionId =
  | 'overview'
  | 'agentSetup'
  | 'inbox'
  | 'workflow'
  | 'analytics';

export type LandingPreviewMetric = {
  label: string;
  value: string;
  detail: string;
  trend: number[];
};

export type LandingPreviewWorkflowNode = {
  id: string;
  title: string;
  description: string;
  kind: 'start' | 'ai' | 'message' | 'booking' | 'handoff' | 'file' | 'image';
  x: number;
  y: number;
};

export type LandingPreviewWorkflowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type LandingPreviewWorkflow = {
  nodes: LandingPreviewWorkflowNode[];
  edges: LandingPreviewWorkflowEdge[];
};

export type LandingPreviewConversation = {
  name: string;
  status: string;
  message: string;
  value: string;
};

export type LandingPreviewInsight = {
  label: string;
  value: string;
  detail: string;
};

export type LandingPreviewAgentSetup = {
  name: string;
  model: string;
  responseLength: string;
  emojiUse: string;
  formality: string;
  humorLevel: string;
  replyMode: string;
  prompt: string;
};

export type LandingPreviewSection = {
  id: LandingPreviewSectionId;
  title: string;
  subtitle: string;
  metrics: LandingPreviewMetric[];
  workflow: LandingPreviewWorkflow;
  conversations: LandingPreviewConversation[];
  agentSetup?: LandingPreviewAgentSetup;
  insights: LandingPreviewInsight[];
};

export const landingPreviewWorkspaceName = 'Arden Heights';
export const landingPreviewAgentName = 'Sales Concierge';

const sharedWorkflow: LandingPreviewWorkflow = {
  nodes: [
    {
      id: 'entry',
      title: 'Message enters',
      description: 'A new website or WhatsApp lead starts a conversation.',
      kind: 'start',
      x: 346,
      y: 78,
    },
    {
      id: 'qualify',
      title: 'Qualify buyer intent',
      description: 'AI checks budget, timeline, and unit preference before routing.',
      kind: 'ai',
      x: 328,
      y: 238,
    },
    {
      id: 'booking',
      title: 'Book showroom visit',
      description: 'Offer available slots and schedule a qualified showroom tour.',
      kind: 'booking',
      x: 488,
      y: 238,
    },
  ],
  edges: [
    { id: 'entry-qualify', source: 'entry', target: 'qualify', label: 'New inbound lead' },
    { id: 'entry-booking', source: 'entry', target: 'booking', label: 'Ready to visit' },
  ],
};

const sharedMetrics: LandingPreviewMetric[] = [
  { label: 'AI-assisted conversation', value: '1,460', detail: '3,920 customer messages', trend: [18, 22, 20, 26, 31, 29, 36] },
  { label: 'Total credits spent', value: '27,781 credits', detail: '19 credits / conversation', trend: [21, 24, 23, 29, 32, 35, 41] },
  { label: 'Booked appointments', value: '224', detail: '15.3% booking rate', trend: [4, 5, 5, 7, 8, 9, 12] },
  { label: 'Human escalation', value: '18', detail: '1.2% escalation rate', trend: [6, 5, 4, 5, 3, 3, 2] },
];

const overviewMetrics: LandingPreviewMetric[] = [
  { label: 'AI-assisted conversation', value: '1,460', detail: '3,920 customer messages handled', trend: [72, 78, 84, 80, 95, 102, 98, 112, 121, 117, 126, 138, 132, 149, 156, 165] },
  { label: 'Total credits spent', value: '27,781 credits', detail: '19.0 credits / conversation', trend: [1320, 1498, 1588, 1512, 1805, 1922, 1856, 2134, 2297, 2214, 2396, 2610, 2492, 2778, 2894, 3070] },
  { label: 'Booked appointments', value: '224', detail: '15.3% booking conversion', trend: [8, 10, 11, 9, 13, 15, 14, 16, 18, 17, 20, 21, 19, 23, 24, 26] },
  { label: 'Human escalation', value: '18', detail: '1.2% needed human help', trend: [3, 2, 4, 3, 5, 4, 3, 4, 2, 3, 2, 4, 3, 2, 1, 2] },
];

const agentSetup: LandingPreviewAgentSetup = {
  name: landingPreviewAgentName,
  model: 'DeepSeek V4 Flash',
  responseLength: 'Brief',
  emojiUse: 'Frequent',
  formality: 'Conversational',
  humorLevel: 'Light',
  replyMode: 'Automatic',
  prompt: '# CONTEXT\nYou are a helpful, versatile AI assistant for Kilobot, A Sales AI Agent. Your primary purpose is to help customers answer their questions clearly and try to engage people to try our product.\n\n# ROLES AND COMMUNICATION STYLE\n- **Role**: General-purpose AI Assistant\n- **Tone**: Professional, clear, concise, and helpful.\n- **Style**: Direct and action-oriented. Provide well-structured answers using lists or bullet points when appropriate.\n\n# TOP-LEVEL FLOW\n1. **Understand**: Read the user message and determine the core request.\n2. **Retrieve**: Use available context and tools to gather relevant facts.\n3. **Resolve**: Address the request directly, keeping responses aligned with business goals.\n4. **Follow Up**: Ask single, concise questions when needed.\n\n# BOUNDARIES\n- Do not fabricate information.\n- Stay within the scope of the business messaging context.',
};

export const landingPreviewSections: LandingPreviewSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    subtitle: '',
    metrics: overviewMetrics,
    workflow: sharedWorkflow,
    conversations: [],
    insights: [
      { label: 'Revenue influenced', value: 'RM 48.2k', detail: '+18% from last period' },
      { label: 'Lead response time', value: '12s', detail: 'Median first reply' },
      { label: 'Qualified leads', value: '328', detail: 'Ready for sales follow-up' },
    ],
  },
  {
    id: 'agentSetup',
    title: 'Configuration',
    subtitle: '',
    metrics: [],
    workflow: sharedWorkflow,
    conversations: [],
    agentSetup,
    insights: [],
  },
  {
    id: 'inbox',
    title: 'Inbox',
    subtitle: 'Live customer conversations',
    metrics: sharedMetrics.slice(0, 3),
    workflow: sharedWorkflow,
    conversations: [
      { name: 'Alicia Tan', status: 'Hot lead', message: 'Can I book the premium facial tomorrow?', value: 'RM 420' },
      { name: 'Marcus Lee', status: 'AI replying', message: 'Asked for package comparison and available slots.', value: 'RM 980' },
      { name: 'Nur Aisyah', status: 'Needs handoff', message: 'Wants corporate team pricing this week.', value: 'RM 2.4k' },
    ],
    insights: [],
  },
  {
    id: 'workflow',
    title: 'Workflow',
    subtitle: '',
    metrics: sharedMetrics.slice(0, 2),
    workflow: sharedWorkflow,
    conversations: [],
    insights: [
      { label: 'Active paths', value: '4', detail: 'Lead qualify, service menu, booking, handoff' },
      { label: 'Automation rate', value: '86%', detail: 'Resolved before human takeover' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    subtitle: 'Sales intelligence summary',
    metrics: sharedMetrics,
    workflow: sharedWorkflow,
    conversations: [],
    insights: [
      { label: 'Top topic', value: 'Pricing', detail: '32% of conversations' },
      { label: 'Positive sentiment', value: '74%', detail: 'Across qualified leads' },
      { label: 'Best channel', value: 'WhatsApp', detail: 'Highest booking conversion' },
    ],
  },
];

export function getLandingPreviewSection(id: string) {
  const section = landingPreviewSections.find((item) => item.id === id);

  if (!section) {
    throw new Error(`Unknown landing preview section: ${id}`);
  }

  return section;
}
