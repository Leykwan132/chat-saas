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
      items: ['automate/workflow-overview', 'automate/build-and-test'],
    },
    {
      type: 'category',
      label: 'Outreach',
      collapsed: false,
      collapsible: false,
      items: [
        'engage/message-templates',
        'engage/broadcast',
        'automate/reminders',
        'automate/follow-ups',
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
