import { Bot, type LucideIcon } from 'lucide-react';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { Accordion } from '@/components/ui/accordion';
import { ANNOUNCEMENTS } from '@/components/whats-new/announcements';
import { WhatsNewDialog } from './WhatsNewDialog';

type Announcement = {
  id: string;
  title: string;
  summary: string;
  details: string[];
  isNew: boolean;
  icon: LucideIcon;
  actionLabel: string;
};

type PopoverListModule = {
  AnnouncementPopoverList: (props: {
    announcements: Announcement[];
    onViewDetails: (announcement: Announcement) => void;
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

  expect(markup).toContain('lucide-package');
  expect(markup).toContain('>What’s new<');
});

test('provides the model support announcement as structured detail data', () => {
  expect(ANNOUNCEMENTS).toHaveLength(1);
  expect(ANNOUNCEMENTS[0]).toMatchObject({
    id: 'model-support-update',
    title: 'Model support update',
    isNew: true,
    actionLabel: 'View full update',
  });
  expect(ANNOUNCEMENTS[0].details).toEqual([
    'Use Qwen3.7 Flash for fast Chinese conversations.',
    'Use NVIDIA Nemotron 3.5 Lightning for faster English responses.',
    'Use GPT-5.6 Luna for slightly stronger performance.',
    'Use GPT-OSS 120B for budget-friendly reasoning.',
  ]);
});

test('renders a single-open accordion with one full-update action per announcement', async () => {
  const { AnnouncementPopoverList } = await vi.importActual<PopoverListModule>(
    './whats-new/AnnouncementPopoverList',
  );
  const announcement: Announcement = {
    id: 'model-support-update',
    title: 'Model support update',
    summary: 'Choose the best model for each conversation.',
    details: ['Use Qwen for Chinese conversations.'],
    isNew: true,
    icon: Bot,
    actionLabel: 'View full update',
  };
  const element = AnnouncementPopoverList({
    announcements: [announcement],
    onViewDetails: () => undefined,
  });
  const accordion = collectElements(element).find((candidate) => candidate.type === Accordion);
  const text = collectText(element).replace(/\s+/g, ' ');

  expect(accordion?.props).toMatchObject({ type: 'single', collapsible: true });
  expect(text).toContain('What’s new in Kilobot');
  expect(text).toContain('Model support update');
  expect(text).toContain('New');
  expect(text.match(/View full update/g)).toHaveLength(1);
});
