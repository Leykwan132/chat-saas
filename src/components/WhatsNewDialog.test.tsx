import {
  Bot,
  CalendarDays,
  ChevronRight,
  Orbit,
  type LucideIcon,
} from 'lucide-react';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import {
  Accordion,
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
import { AnnouncementReleaseDetails } from '@/components/whats-new/AnnouncementReleaseDetails';
import { WhatsNewDialog } from './WhatsNewDialog';

type Announcement = {
  id: string;
  title: string;
  summary: string;
  releaseTitle: string;
  releaseSummary: string;
  newModels: Array<{ name: string; description: string }>;
  retiredModels: string[];
  modelCosts: Array<{ cost: string; models: string[] }>;
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
    src: 'https://storage.kilobot.app/dashboard/new-feature.png',
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
    releaseTitle: 'New Credit system for Models.',
    releaseSummary:
      'Model pricing now uses clear credit tiers for every message.',
    publishedAt: '2026-08-12',
    isNew: true,
    icon: Orbit,
  });
  expect(ANNOUNCEMENTS[0].newModels).toEqual([
    {
      name: 'OpenAI GPT-OSS 120B',
      description: 'Budget-friendly reasoning',
    },
    {
      name: 'Qwen3.7 Flash',
      description: 'Fast Chinese conversations',
    },
    {
      name: 'NVIDIA Nemotron 3.5 Lightning',
      description: 'Fast English responses',
    },
    {
      name: 'GPT-5.6 Luna',
      description: 'Higher overall performance',
    },
  ]);
  expect(ANNOUNCEMENTS[0].retiredModels).toEqual([
    'Amazon Nova Micro',
    'Google Gemini 3.1 Flash Lite',
  ]);
  expect(ANNOUNCEMENTS[0].modelCosts).toEqual([
    {
      cost: '0.5 credits/message',
      models: ['OpenAI GPT-OSS 120B', 'Qwen3.7 Flash'],
    },
    {
      cost: '1 credit/message',
      models: ['DeepSeek V4 Flash', 'NVIDIA Nemotron 3.5 Lightning'],
    },
    {
      cost: '2 credits/message',
      models: ['GPT-5.6 Luna'],
    },
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
    releaseTitle: 'New Credit system for Models.',
    releaseSummary:
      'Model pricing now uses clear credit tiers for every message.',
    newModels: [
      {
        name: 'OpenAI GPT-OSS 120B',
        description: 'Budget-friendly reasoning',
      },
      {
        name: 'Qwen3.7 Flash',
        description: 'Fast Chinese conversations',
      },
      {
        name: 'NVIDIA Nemotron 3.5 Lightning',
        description: 'Fast English responses',
      },
      {
        name: 'GPT-5.6 Luna',
        description: 'Higher overall performance',
      },
    ],
    retiredModels: ['Amazon Nova Micro', 'Google Gemini 3.1 Flash Lite'],
    modelCosts: [
      {
        cost: '0.5 credits/message',
        models: ['OpenAI GPT-OSS 120B', 'Qwen3.7 Flash'],
      },
      {
        cost: '1 credit/message',
        models: ['DeepSeek V4 Flash', 'NVIDIA Nemotron 3.5 Lightning'],
      },
      {
        cost: '2 credits/message',
        models: ['GPT-5.6 Luna'],
      },
    ],
    publishedAt: '2026-08-12',
    isNew: true,
    icon: Bot,
  };
  const element = AnnouncementDialogList({ announcements: [announcement] });
  const descendants = collectElements(element);
  const accordion = descendants.find((candidate) => candidate.type === Accordion);
  const accordionTrigger = descendants.find(
    (candidate) => candidate.type === AccordionTrigger,
  ) as ReactElement<{ showIndicator?: boolean }> | undefined;
  const badge = descendants.find(
    (candidate) => candidate.type === Badge,
  ) as ReactElement<{ className?: string }> | undefined;
  const releaseDetails = descendants.find(
    (candidate) => candidate.type === AnnouncementReleaseDetails,
  ) as ReactElement<{ announcement: Announcement }> | undefined;
  const renderedReleaseDetails = releaseDetails
    ? AnnouncementReleaseDetails(releaseDetails.props)
    : undefined;
  const renderedReleaseElements = collectElements(renderedReleaseDetails);
  const contentDate = renderedReleaseElements.find(
    (candidate) => candidate.type === 'time',
  );
  const calendar = renderedReleaseElements.find(
    (candidate) => candidate.type === CalendarDays,
  );
  const releaseText = collectText(renderedReleaseDetails).replace(/\s+/g, ' ');
  const nestedReleaseClassNames = renderedReleaseElements
    .slice(1)
    .map(
      (candidate) =>
        (candidate as ReactElement<{ className?: string }>).props.className,
    )
    .filter((className): className is string => typeof className === 'string')
    .join(' ');
  const releaseChildren = renderedReleaseDetails
    ? Array.isArray(renderedReleaseDetails.props.children)
      ? renderedReleaseDetails.props.children
      : [renderedReleaseDetails.props.children]
    : [];
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
  expect(collectText(accordionTrigger)).not.toContain('12 Aug 2026');
  expect(releaseText).toContain('Released on 12 Aug 2026');
  expect(contentDate?.props).toMatchObject({ dateTime: '2026-08-12' });
  expect(calendar).toBeDefined();
  expect(badge?.props.className).toContain('bg-muted');
  expect(accordionTrigger?.props.showIndicator).toBe(false);
  expect(chevron?.props.className).toContain(
    'group-data-[state=open]/accordion-trigger:rotate-90',
  );
  expect(releaseText).toContain('New Credit system for Models.');
  expect(releaseText).toContain('New Models');
  expect(releaseText).toContain('Retired Models');
  expect(releaseText).toContain('Cost of Models');
  expect(releaseText).toContain('OpenAI GPT-OSS 120B Budget-friendly reasoning');
  expect(releaseText).toContain('Qwen3.7 Flash Fast Chinese conversations');
  expect(releaseText).toContain(
    'NVIDIA Nemotron 3.5 Lightning Fast English responses',
  );
  expect(releaseText).toContain('GPT-5.6 Luna Higher overall performance');
  expect(releaseText).toContain(
    'Amazon Nova Micro and Google Gemini 3.1 Flash Lite are no longer available.',
  );
  expect(releaseText).toContain(
    '0.5 credits/message OpenAI GPT-OSS 120B, Qwen3.7 Flash',
  );
  expect(releaseText).toContain(
    '1 credit/message DeepSeek V4 Flash, NVIDIA Nemotron 3.5 Lightning',
  );
  expect(releaseText).toContain('2 credits/message GPT-5.6 Luna');
  expect(releaseText.indexOf('New Models')).toBeLessThan(
    releaseText.indexOf('Retired Models'),
  );
  expect(releaseText.indexOf('Retired Models')).toBeLessThan(
    releaseText.indexOf('Cost of Models'),
  );
  expect(releaseText.indexOf('Cost of Models')).toBeLessThan(
    releaseText.indexOf('Released on 12 Aug 2026'),
  );
  expect(collectText(releaseChildren.at(-1))).toContain(
    'Released on 12 Aug 2026',
  );
  expect(renderedReleaseDetails?.props.className).not.toContain('pl-8');
  expect(renderedReleaseDetails?.props.className).toContain('rounded-xl');
  expect(renderedReleaseDetails?.props.className).toContain('bg-muted/40');
  expect(renderedReleaseDetails?.props.className).toContain('p-5');
  expect(renderedReleaseDetails?.props.className).toContain('gap-6');
  expect(nestedReleaseClassNames).not.toContain('rounded-xl');
  expect(nestedReleaseClassNames).not.toContain('bg-muted/40');
  expect(nestedReleaseClassNames).not.toContain('bg-muted/60');
  expect(nestedReleaseClassNames).not.toContain('grid-cols-3');
  expect(text).not.toContain('View full update');
});
