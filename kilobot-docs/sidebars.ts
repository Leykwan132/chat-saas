import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  helpCenterSidebar: [
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      collapsible: false,
      items: ['start-here/welcome', 'start-here/quick-start'],
    },
    {
      type: 'category',
      label: 'Agent',
      collapsed: false,
      collapsible: false,
      items: [
        'build-your-agent/agent-setup',
        'build-your-agent/knowledge-base',
      ],
    },
    {
      type: 'category',
      label: 'Channels',
      collapsed: false,
      collapsible: false,
      items: [
        'channels/connect-channels',
        'channels/website-widget',
        'channels/whatsapp',
        'channels/instagram',
        'channels/messenger',
        {
          type: 'category',
          label: 'Conversations',
          collapsed: false,
          items: ['engage/inbox', 'engage/contacts'],
        },
      ],
    },
    {
      type: 'category',
      label: 'Bookings',
      collapsed: false,
      collapsible: false,
      items: [
        'bookings/services',
        'bookings/availability',
        'bookings/calendar',
      ],
    },
    {
      type: 'category',
      label: 'Workflows',
      collapsed: false,
      collapsible: false,
      items: [
        {
          type: 'doc',
          id: 'automate/send-messages-and-assets',
          label: 'Send messages and assets',
        },
        {
          type: 'doc',
          id: 'automate/human-in-the-loop',
          label: 'Human in the loop',
        },
        {
          type: 'doc',
          id: 'automate/automate-bookings',
          label: 'Automate bookings',
        },
        {
          type: 'doc',
          id: 'automate/reminders',
          label: 'Reminders',
        },
        {
          type: 'doc',
          id: 'automate/follow-ups',
          label: 'Follow-ups',
        },
      ],
    },
    {
      type: 'category',
      label: 'Broadcast',
      collapsed: false,
      collapsible: false,
      items: [
        {
          type: 'doc',
          id: 'engage/broadcast',
          label: 'Create a broadcast',
        },
        {
          type: 'doc',
          id: 'engage/message-templates',
          label: 'Message templates',
        },
      ],
    },
    {
      type: 'category',
      label: 'Teams',
      collapsed: false,
      collapsible: false,
      items: [
        'start-here/workspaces-and-agents',
        'team/workspace-and-team',
        'team/roles-and-permissions',
        'team/lead-assignment',
      ],
    },
    {
      type: 'category',
      label: 'Releases',
      collapsed: false,
      collapsible: false,
      items: ['releases/changelog'],
    },
    {
      type: 'category',
      label: 'Help and support',
      collapsed: false,
      collapsible: false,
      items: ['help/troubleshooting', 'help/contact-support'],
    },
  ],
};

export default sidebars;
