import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./AgentsSidebar.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('matches the agent workflow sidebar Kilobot lockup spacing', () => {
  expect(source).toContain("import { ExpandedAppSidebarHeader } from '@/components/ExpandedAppSidebarHeader';");
  expect(source).toContain('<ExpandedAppSidebarHeader onCollapse={toggleSidebar} />');
});
