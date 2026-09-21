import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AgentSidebarNavigation } from './AgentSidebarNavigation';
import { PiHouse } from 'react-icons/pi';

describe('AgentSidebarNavigation', () => {
  const singleOverviewSection = [{
    label: 'Overview',
    icon: PiHouse,
    items: [{
      to: '/dashboard/agent-id/overview',
      icon: PiHouse,
      label: 'Overview',
      requiredPermission: 'analytics:read' as const,
    }],
  }];
  const multiItemSection = [{
    ...singleOverviewSection[0],
    items: [
      ...singleOverviewSection[0].items,
      {
        to: '/dashboard/agent-id/secondary',
        icon: PiHouse,
        label: 'Secondary',
        requiredPermission: 'analytics:read' as const,
      },
    ],
  }];

  test('gives section triggers the same inset as the brand mark and adds vertical breathing room', () => {
    const markup = renderToStaticMarkup(
      <TooltipProvider>
        <MemoryRouter>
          <SidebarProvider>
            <AgentSidebarNavigation
              pathname="/dashboard/agent-id/overview"
              sections={multiItemSection}
              totalUnread={undefined}
              formatUnreadBadgeCount={String}
            />
          </SidebarProvider>
        </MemoryRouter>
      </TooltipProvider>,
    );

    expect(markup).toContain('py-[0.15rem]');
    expect(markup).toContain('px-[0.45rem]');
    expect(markup).toContain('pl-[0.9rem]');
    expect(markup).toContain('gap-0');
  });

  test('renders a single-item section directly without a collapse trigger', () => {
    const markup = renderToStaticMarkup(
      <TooltipProvider>
        <MemoryRouter>
          <SidebarProvider>
            <AgentSidebarNavigation
              pathname="/dashboard/agent-id/overview"
              sections={singleOverviewSection}
              totalUnread={undefined}
              formatUnreadBadgeCount={String}
            />
          </SidebarProvider>
        </MemoryRouter>
      </TooltipProvider>,
    );

    expect(markup).not.toContain('data-slot="collapsible"');
    expect(markup).toContain('href="/dashboard/agent-id/overview"');
    expect(markup).toContain('px-[0.45rem]');
  });
});
