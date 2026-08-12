import { Bot, ChevronRight, Orbit, type LucideIcon } from 'lucide-react';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import {
  Accordion,
  AccordionContent,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  publishedAt: string;
  isNew: boolean;
  icon: LucideIcon;
};

type DialogListModule = {
  AnnouncementDialogList: (props: {
    announcements: Announcement[];
  }) => ReactElement<{ className?: string }>;
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
  const dialogContent = descendants.find(
    (candidate) => candidate.type === DialogContent,
  ) as ReactElement<{ className?: string }> | undefined;
  const banner = descendants.find(
    (candidate) => candidate.type === 'img',
  ) as ReactElement<{
    alt?: string;
    className?: string;
    src?: string;
  }> | undefined;

  expect(markup).toContain('lucide-package');
  expect(markup).toContain('>What’s new<');
  expect(markup).toContain('data-slot="dialog-trigger"');
  expect(markup).not.toContain('data-slot="popover-trigger"');
  expect(element.type).toBe(Dialog);
  expect(descendants.some((candidate) => candidate.type === DialogTrigger)).toBe(true);
  expect(dialogContent?.props.className).toContain(
    'max-h-[calc(100dvh-2rem)]',
  );
  expect(descendants.some((candidate) => candidate.type === DialogDescription)).toBe(true);
  expect(banner?.props).toMatchObject({
    src: 'https://storage.kilobot.app/dashboard/new%20feature%402x.png',
    alt: 'Kilobot AI conversations and call analytics preview',
  });
  expect(banner?.props.className).toContain('aspect-[4/1]');
  expect(banner?.props.className).toContain('max-h-[21dvh]');
  expect(banner?.props.className).toContain('w-full');
  expect(banner?.props.className).toContain('object-cover');
});

test('provides the model support announcement as structured detail data', () => {
  expect(ANNOUNCEMENTS).toHaveLength(1);
  expect(ANNOUNCEMENTS[0]).toMatchObject({
    id: 'model-support-update',
    title: 'Model support update',
    publishedAt: '2026-08-12',
    isNew: true,
    icon: Orbit,
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
    publishedAt: '2026-08-12',
    isNew: true,
    icon: Bot,
  };
  const element = AnnouncementDialogList({ announcements: [announcement] });
  const descendants = collectElements(element);
  const accordion = descendants.find((candidate) => candidate.type === Accordion);
  const accordionContent = descendants.find(
    (candidate) => candidate.type === AccordionContent,
  );
  const accordionTrigger = descendants.find(
    (candidate) => candidate.type === AccordionTrigger,
  ) as ReactElement<{ showIndicator?: boolean }> | undefined;
  const badge = descendants.find(
    (candidate) => candidate.type === Badge,
  ) as ReactElement<{ className?: string }> | undefined;
  const date = descendants.find((candidate) => candidate.type === 'time');
  const chevron = descendants.find(
    (candidate) => candidate.type === ChevronRight,
  ) as ReactElement<{ className?: string }> | undefined;
  const scrollArea = descendants.find(
    (candidate) => candidate.type === ScrollArea,
  ) as ReactElement<{ className?: string }> | undefined;
  const text = collectText(element).replace(/\s+/g, ' ');

  expect(element.props.className).toContain('min-h-0');
  expect(scrollArea?.props.className).toContain('min-h-0');
  expect(scrollArea?.props.className).toContain('flex-1');
  expect(accordion?.props).toMatchObject({ type: 'single', collapsible: true });
  expect(descendants.some((candidate) => candidate.type === DialogTitle)).toBe(true);
  expect(text).toContain('What’s new in Kilobot');
  expect(text).toContain('Model support update');
  expect(text).toContain('New');
  expect(text).toContain('12 Aug 2026');
  expect(date?.props).toMatchObject({ dateTime: '2026-08-12' });
  expect(badge?.props.className).toContain('bg-muted');
  expect(accordionTrigger?.props.showIndicator).toBe(false);
  expect(chevron?.props.className).toContain(
    'group-data-[state=open]/accordion-trigger:rotate-90',
  );
  expect(collectText(accordionContent)).toContain('Use Qwen for Chinese conversations.');
  expect(text).not.toContain('View full update');
});
