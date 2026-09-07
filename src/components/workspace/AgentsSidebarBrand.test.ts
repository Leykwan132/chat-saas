import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('./AgentsSidebar.tsx', import.meta.url)),
  'utf8',
);
const dashboardSource = readFileSync(
  fileURLToPath(new URL('../app-sidebar.tsx', import.meta.url)),
  'utf8',
);

test('both sidebars show the hostname brand instead of a hardcoded Kilobot mark', () => {
  for (const sidebar of [source, dashboardSource]) {
    expect(sidebar).toContain('useHostBrand()');
    expect(sidebar).toContain('<ExpandedAppSidebarHeader onCollapse={toggleSidebar} brand={hostBrand} />');
    expect(sidebar).toContain('<HostBrandMark');
    expect(sidebar).not.toContain('/icon.svg');
  }
});
