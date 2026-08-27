import type { Chat, ConversationPlatform } from '@/components/ChatRow';
import type { InboxUIMessage } from '@/lib/inboxOptimistic';
import type { Id } from '../../../convex/_generated/dataModel';

const demoConversationId = (value: string) => value as Id<'conversations'>;

export const INBOX_DEMO_PLATFORM_LABELS: Record<ConversationPlatform, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  web: 'Web',
  avatar: 'Avatar',
};

export const INBOX_DEMO_CONTACT_DETAILS: Record<string, { phone: string; email: string }> = {
  'demo-maya-chen': { phone: '+60 12-345 6789', email: 'maya.chen@example.com' },
  'demo-jordan-lee': { phone: '+60 17-222 4588', email: 'jordan.lee@example.com' },
  'demo-aisha-rahman': { phone: '+60 11-908 3312', email: 'aisha.rahman@example.com' },
  'demo-noah-tan': { phone: '+60 16-774 1090', email: 'noah.tan@example.com' },
};

export const INBOX_DEMO_CONVERSATIONS: Chat[] = [
  {
    id: demoConversationId('demo-maya-chen'),
    name: 'Maya Chen',
    message: 'That sounds perfect, thank you!',
    time: '2m',
    unread: 2,
    platform: 'whatsapp',
    requiresAction: true,
    conversationStatus: 'open',
    tags: ['New lead'],
    leadTemperature: 'Hot',
  },
  {
    id: demoConversationId('demo-jordan-lee'),
    name: 'Jordan Lee',
    message: 'Can I move my appointment to Friday?',
    time: '18m',
    unread: 1,
    platform: 'instagram',
    requiresAction: true,
    conversationStatus: 'requires_user_input',
    escalation: {
      question: 'Can I move my appointment to Friday?',
      context: 'The customer needs help changing an existing booking.',
      escalatedAt: Date.now() - 18 * 60 * 1000,
    },
  },
  {
    id: demoConversationId('demo-aisha-rahman'),
    name: 'Aisha Rahman',
    message: 'I would like to learn more about your starter plan.',
    time: '1h',
    unread: 0,
    platform: 'messenger',
    requiresAction: false,
    conversationStatus: 'open',
    tags: ['Pricing'],
    leadTemperature: 'Warm',
  },
  {
    id: demoConversationId('demo-noah-tan'),
    name: 'Noah Tan',
    message: 'Thanks for the quick answer!',
    time: 'Yesterday',
    unread: 0,
    platform: 'web',
    requiresAction: false,
    conversationStatus: 'closed',
  },
];

function demoMessage(
  key: string,
  role: 'user' | 'assistant',
  text: string,
  createdAt: number,
  agentName?: string,
): InboxUIMessage {
  return {
    key,
    id: key,
    order: createdAt,
    stepOrder: 0,
    status: 'success',
    role,
    text,
    parts: [{ type: 'text', text }],
    _creationTime: createdAt,
    agentName,
    sentByAi: role === 'assistant',
    channelStatus: role === 'assistant' ? 'read' : undefined,
  } as InboxUIMessage;
}

const now = Date.now();

export const INBOX_DEMO_MESSAGES: Record<string, InboxUIMessage[]> = {
  'demo-maya-chen': [
    demoMessage('maya-1', 'user', 'Hi! Do you have any openings this week?', now - 22 * 60 * 1000),
    demoMessage('maya-2', 'assistant', 'Absolutely. I can help you find a time that works.', now - 20 * 60 * 1000, 'Kilobot'),
    demoMessage('maya-3', 'user', 'Friday afternoon would be great.', now - 6 * 60 * 1000),
    demoMessage('maya-4', 'assistant', 'I have a 3:00 PM opening on Friday. Should I reserve it for you?', now - 4 * 60 * 1000, 'Kilobot'),
    demoMessage('maya-5', 'user', 'That sounds perfect, thank you!', now - 2 * 60 * 1000),
  ],
  'demo-jordan-lee': [
    demoMessage('jordan-1', 'user', 'Can I move my appointment to Friday?', now - 18 * 60 * 1000),
    demoMessage('jordan-2', 'assistant', 'I’m checking the available times for you now.', now - 17 * 60 * 1000, 'Kilobot'),
  ],
  'demo-aisha-rahman': [
    demoMessage('aisha-1', 'user', 'I would like to learn more about your starter plan.', now - 65 * 60 * 1000),
    demoMessage('aisha-2', 'assistant', 'The starter plan includes one active agent and 2,000 monthly credits.', now - 63 * 60 * 1000, 'Kilobot'),
    demoMessage('aisha-3', 'user', 'That is helpful, thanks!', now - 60 * 60 * 1000),
  ],
  'demo-noah-tan': [
    demoMessage('noah-1', 'user', 'How do I connect my website?', now - 25 * 60 * 60 * 1000),
    demoMessage('noah-2', 'assistant', 'Open Channels, choose Website, and copy the widget snippet into your site.', now - 24 * 60 * 60 * 1000, 'Kilobot'),
    demoMessage('noah-3', 'user', 'Thanks for the quick answer!', now - 23 * 60 * 60 * 1000),
  ],
};
