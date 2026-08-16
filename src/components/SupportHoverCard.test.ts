import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function readSource(relativePath: string) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  return existsSync(sourceUrl) ? readFileSync(sourceUrl, 'utf8') : '';
}

const componentSource = readSource('./SupportHoverCard.tsx');
const whatsNewSource = readSource('./WhatsNewDialog.tsx');
const dashboardSource = readSource('../layouts/DashboardLayout.tsx');
const workspaceSource = readSource('../pages/WorkspacePage.tsx');
const siteHeaderSource = readSource('./site-header/SiteHeaderActions.tsx');
const legalHeaderSource = readSource('./LegalDocumentLayout.tsx');
const blogHeaderSource = readSource('./BlogPostLayout.tsx');

test('offers the help center and exact direct support destinations', () => {
  expect(componentSource).toContain('KILOBOT_DOCS_URL');
  expect(componentSource).toContain('https://forms.gle/Hoo56T7Qj3yEBEeZ9');
  expect(componentSource).toContain('https://wa.me/60129499394');
  expect(componentSource).toContain('mailto:support@kilobot.app');
  expect(componentSource.match(/target: '_blank'/g)).toHaveLength(2);
  expect(componentSource.match(/rel: 'noreferrer'/g)).toHaveLength(2);
});

test('uses the requested icons and fully clickable three-card composition', () => {
  expect(componentSource).toContain('MessageCircleQuestionMark');
  expect(componentSource).toContain('SiWhatsapp');
  expect(componentSource).toContain('aria-label="Contact support"');
  expect(componentSource).toContain('Need help?');
  expect(componentSource).toContain('grid grid-cols-2 gap-3');
  expect(componentSource).toContain('SUPPORT_OPTIONS.map');
  expect(componentSource).toContain('<a');
  expect(componentSource).toContain('<Card');
  expect(componentSource).toContain('onClick={() => setOpen(false)}');
});

test('places What’s new and support before dark mode only in authenticated headers', () => {
  expect(dashboardSource).toContain("import { SupportHoverCard } from '@/components/SupportHoverCard'");
  expect(workspaceSource).toContain("import { SupportHoverCard } from '@/components/SupportHoverCard'");
  expect(dashboardSource).toContain("import { WhatsNewDialog } from '@/components/WhatsNewDialog'");
  expect(workspaceSource).toContain("import { WhatsNewDialog } from '@/components/WhatsNewDialog'");
  expect(whatsNewSource).toContain("import { Package } from 'lucide-react'");
  expect(whatsNewSource).toContain('What’s new');
  expect(dashboardSource.indexOf('<WhatsNewDialog />')).toBeLessThan(
    dashboardSource.indexOf('<SupportHoverCard />'),
  );
  expect(workspaceSource.indexOf('<WhatsNewDialog />')).toBeLessThan(
    workspaceSource.indexOf('<SupportHoverCard />'),
  );
  expect(dashboardSource.indexOf('<SupportHoverCard />')).toBeLessThan(
    dashboardSource.indexOf('<ModeToggle />'),
  );
  expect(workspaceSource.indexOf('<SupportHoverCard />')).toBeLessThan(
    workspaceSource.indexOf('<ModeToggle />'),
  );
  expect(siteHeaderSource).not.toContain('SupportHoverCard');
  expect(legalHeaderSource).not.toContain('SupportHoverCard');
  expect(blogHeaderSource).not.toContain('SupportHoverCard');
});
