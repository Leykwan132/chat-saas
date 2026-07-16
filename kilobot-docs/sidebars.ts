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
        'start-here/launch-guide',
        'start-here/workspaces-and-agents',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      collapsible: false,
      items: [
        'build-your-agent/agent-setup',
        'build-your-agent/knowledge-base',
        'automate/workflow-overview',
        'bookings/services',
        'bookings/availability',
        'channels/connect-channels',
      ],
    },
    {
      type: 'category',
      label: 'Resources',
      collapsed: false,
      collapsible: false,
      items: [
        'engage/inbox',
        'engage/contacts',
        'bookings/calendar',
        'engage/message-templates',
        'automate/reminders',
        'automate/follow-ups',
        'engage/quick-replies',
        'engage/broadcast',
        'team/workspace-and-team',
        'team/roles-and-permissions',
        'team/lead-assignment',
        'insights/overview-and-analytics',
        'insights/usage-and-billing',
      ],
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
