import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('./AgentsSidebar.tsx', import.meta.url)),
  'utf8',
);

test('uses the compact Phosphor sidebar treatment for workspace navigation', () => {
  expect(source).toContain("from 'react-icons/pi'");
  expect(source).toContain('SidebarContent className="gap-0"');
  expect(source).toContain('SidebarGroup className="py-[0.15rem]"');
  expect(source).toContain('SidebarMenu className="gap-[0.3rem]"');
  expect(source).toContain('px-[0.45rem]');
  expect(source).toContain('PiBriefcase');
  expect(source).not.toContain('PiRobot');
  expect(source).toContain('PiChartBar');
  expect(source).toContain('tooltip="Workspace"');
  expect(source).toContain('<span>Workspace</span>');
  expect(source).toContain('tooltip="Workspace Usage"');
  expect(source).toContain('<span>Workspace Usage</span>');
});
