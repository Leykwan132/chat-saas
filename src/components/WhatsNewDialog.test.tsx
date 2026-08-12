import { Bot, type LucideIcon } from 'lucide-react';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { Accordion, AccordionContent } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ANNOUNCEMENTS } from '@/components/whats-new/announcements';
import { WhatsNewDialog } from './WhatsNewDialog';

type Announcement = {
  id: string;
  title: string;
  summary: string;
  details: string[];
  isNew: boolean;
  icon: LucideIcon;
};

type DialogListModule = {
  AnnouncementDialogList: (props: {
    announcements: Announcement[];
  }) => ReactElement;
};

function collectElements(node: ReactNode): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(collectElements);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node, ...collectElements(node.props.children)];
}

function collectText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(' ');
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return collectText(node.props.children);
}

test('renders a labeled Package button that opens the announcement panel', () => {
  const markup = renderToStaticMarkup(<WhatsNewDialog />);
  const element = WhatsNewDialog();
  const descendants = collectElements(element);

  expect(markup).toContain('lucide-package');
  expect(markup).toContain('>What’s new<');
  expect(markup).toContain('data-slot="dialog-trigger"');
  expect(markup).not.toContain('data-slot="popover-trigger"');
  expect(element.type).toBe(Dialog);
  expect(descendants.some((candidate) => candidate.type === DialogTrigger)).toBe(true);
  expect(descendants.some((candidate) => candidate.type === DialogContent)).toBe(true);
  expect(descendants.some((candidate) => candidate.type === DialogDescription)).toBe(true);
});

test('provides the model support announcement as structured detail data', () => {
  expect(ANNOUNCEMENTS).toHaveLength(1);
  expect(ANNOUNCEMENTS[0]).toMatchObject({
    id: 'model-support-update',
    title: 'Model support update',
    isNew: true,
  });
  expect(ANNOUNCEMENTS[0].details).toEqual([
    'Use Qwen3.7 Flash for fast Chinese conversations.',
    'Use NVIDIA Nemotron 3.5 Lightning for fast English responses.',
    'Use GPT-5.6 Luna for stronger performance.',
    'Use GPT-OSS 120B for budget-friendly reasoning.',
  ]);
});

test('renders a single-open accordion with full details inline', async () => {
  const { AnnouncementDialogList } = await vi.importActual<DialogListModule>(
    './whats-new/AnnouncementDialogList',
  );
  const announcement: Announcement = {
    id: 'model-support-update',
    title: 'Model support update',
    summary: 'Choose the best model for each conversation.',
    details: ['Use Qwen for Chinese conversations.'],
    isNew: true,
    icon: Bot,
  };
  const element = AnnouncementDialogList({ announcements: [announcement] });
  const descendants = collectElements(element);
  const accordion = descendants.find((candidate) => candidate.type === Accordion);
  const accordionContent = descendants.find(
    (candidate) => candidate.type === AccordionContent,
  );
  const text = collectText(element).replace(/\s+/g, ' ');

  expect(accordion?.props).toMatchObject({ type: 'single', collapsible: true });
  expect(descendants.some((candidate) => candidate.type === DialogTitle)).toBe(true);
  expect(text).toContain('What’s new in Kilobot');
  expect(text).toContain('Model support update');
  expect(text).toContain('New');
  expect(collectText(accordionContent)).toContain('Use Qwen for Chinese conversations.');
  expect(text).not.toContain('View full update');
});
