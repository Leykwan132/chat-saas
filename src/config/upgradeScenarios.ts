export interface FeatureItem {
  title: string;
  description: string;
}

export interface UpgradeScenarioConfig {
  fromPlan: string;
  toPlan: string;
  toPlanName: string;
  title: string;
  description: string;
  features: FeatureItem[];
}

export const UPGRADE_SCENARIOS: Record<'free_to_starter' | 'starter_to_growth' | 'growth_to_business', UpgradeScenarioConfig> = {
  free_to_starter: {
    fromPlan: 'free',
    toPlan: 'starter',
    toPlanName: 'Starter',
    title: 'Unlock Starter Features',
    description: 'Unlock multiple agents, lead insights, and premium AI models.',
    features: [
      {
        title: 'Advanced AI Models',
        description: 'Access DeepSeek, Gemini, GPT-5.6 Luna, Nemotron, and Qwen3.7 Flash.',
      },
      {
        title: '2,000 Monthly Credits',
        description: 'More room for messages and campaigns.',
      },
      {
        title: 'Up to 2 AI Agents',
        description: 'Deploy specialized sales and support agents.',
      },
      {
        title: 'Auto Lead Tagging',
        description: 'Label and organize new leads automatically.',
      },
      {
        title: '5 Team Members',
        description: 'Collaborate, assign chats, and work together.',
      },
      {
        title: 'Conversation Summaries',
        description: 'Digest long threads into quick AI summaries.',
      },
    ],
  },
  starter_to_growth: {
    fromPlan: 'starter',
    toPlan: 'growth',
    toPlanName: 'Growth',
    title: 'Scale with Growth',
    description: 'Automate bookings, sync calendar schedules, and scale support.',
    features: [
      {
        title: 'Services & Scheduling',
        description: 'Book meetings and sync calendars automatically.',
      },
      {
        title: 'Up to 5 AI Agents',
        description: 'Deploy specialized agents for every department.',
      },
      {
        title: '8,000 Monthly Credits',
        description: 'High credit capacity for growing chat volume.',
      },
      {
        title: 'Auto Reply & Custom Agents',
        description: 'Run fully autonomous 24/7 chat workflows.',
      },
      {
        title: 'Topic Analytics',
        description: 'Spot chat trends and FAQs with AI clustering.',
      },
      {
        title: '10 Team Members',
        description: 'Expand your support team with custom roles.',
      },
    ],
  },
  growth_to_business: {
    fromPlan: 'growth',
    toPlan: 'business',
    toPlanName: 'Business',
    title: 'Enterprise Power with Business',
    description: 'Get enterprise credit limits, maximum channels, and priority speed.',
    features: [
      {
        title: '20,000 Monthly Credits',
        description: 'Enterprise credit limits for high chat volumes.',
      },
      {
        title: 'Up to 10 AI Agents',
        description: 'Build advanced multi-agent business flows.',
      },
      {
        title: '15 Connected Channels',
        description: 'Integrate multiple WhatsApp, IG, and FB pages.',
      },
      {
        title: '25 Team Members',
        description: 'Empower your entire company in a shared space.',
      },
      {
        title: '40MB Knowledge Base',
        description: 'Upload large catalogs and manuals per agent.',
      },
      {
        title: 'Priority Performance',
        description: 'Get faster execution times and peak speed.',
      },
    ],
  },
};
