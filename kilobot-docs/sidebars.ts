import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  helpCenterSidebar: [
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      collapsible: false,
      items: [
        'start-here/welcome',
        'start-here/core-concepts',
        'start-here/launch-guide',
        'start-here/workspaces-and-agents',
      ],
    },
    {
      type: 'category',
      label: 'AI agent',
      collapsed: false,
      collapsible: false,
      items: ['build-your-agent/agent-setup', 'build-your-agent/knowledge-base'],
    },
    {
      type: 'category',
      label: 'Workflow automation',
      collapsed: false,
      collapsible: false,
      items: [
        'automate/workflow-overview',
        'automate/workflow-actions',
        'automate/reminders',
        'automate/follow-ups',
      ],
    },
    {
      type: 'category',
      label: 'Channels',
      collapsed: false,
      collapsible: false,
      items: ['channels/connect-channels'],
    },
    {
      type: 'category',
      label: 'Bookings',
      collapsed: false,
      collapsible: false,
      items: ['bookings/services', 'bookings/availability', 'bookings/calendar'],
    },
    {
      type: 'category',
      label: 'Inbox and engagement',
      collapsed: false,
      collapsible: false,
      items: [
        'engage/inbox',
        'engage/contacts',
        'engage/quick-replies',
        'engage/message-templates',
        'engage/broadcast',
      ],
    },
    {
      type: 'category',
      label: 'Team management',
      collapsed: false,
      collapsible: false,
      items: ['team/lead-assignment', 'team/workspace-and-team', 'team/roles-and-permissions'],
    },
    {
      type: 'category',
      label: 'Insights and billing',
      collapsed: false,
      collapsible: false,
      items: ['insights/overview-and-analytics', 'insights/usage-and-billing'],
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
