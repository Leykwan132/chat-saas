import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Rating, StickerStar } from '@smastrom/react-rating';
import { Check } from 'lucide-react';
import { expect, test, vi } from 'vitest';
import { ModelSelectorLogo } from '@/components/ai-elements/model-selector';
import { HoverCard } from '@/components/ui/hover-card';

type HoverCardModule = {
  ModelScoreHoverCard: (props: {
    modelId: string;
    modelLabel: string;
    chefSlug: string;
    imageUrl?: string;
    children: ReactElement;
  }) => ReactElement;
};

type ProgressElementProps = {
  role?: string;
  'aria-label'?: string;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
};

type RatingRowProps = {
  className?: string;
  children?: ReactNode;
};

type LanguagePillProps = {
  className?: string;
  'data-slot'?: string;
};

type SlotElementProps = {
  className?: string;
  children?: ReactNode;
  'data-slot'?: string;
};

type CheckIconProps = {
  className?: string;
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

test('shows the model scorecard in a read-only rating HoverCard', async () => {
  const { ModelScoreHoverCard } = await vi.importActual<HoverCardModule>('./ModelScoreHoverCard');
  const child = createElement('button', null, 'Qwen3.7 Flash');
  const element = ModelScoreHoverCard({
    modelId: 'qwen/qwen3.7-flash',
    modelLabel: 'Qwen3.7 Flash',
    chefSlug: 'qwen',
    children: child,
  });
  const descendants = collectElements(element);
  const rating = descendants.find((candidate) => candidate.type === Rating);
  const ratingIndex = descendants.findIndex(
    (candidate) =>
      (candidate.props as SlotElementProps)['data-slot'] === 'model-rating',
  );
  const identityIndex = descendants.findIndex(
    (candidate) =>
      (candidate.props as SlotElementProps)['data-slot'] === 'model-identity',
  );
  const descriptionIndex = descendants.findIndex(
    (candidate) =>
      (candidate.props as SlotElementProps)['data-slot'] ===
      'model-description',
  );
  const metricsIndex = descendants.findIndex(
    (candidate) => candidate.type === 'dl',
  );
  const languagesIndex = descendants.findIndex(
    (candidate) =>
      (candidate.props as SlotElementProps)['data-slot'] === 'model-languages',
  );
  const ratingRow = descendants.find((candidate) => {
    const props = candidate.props as RatingRowProps;
    const children = Array.isArray(props.children)
      ? props.children
      : [props.children];

    return children.some(
      (child) => isValidElement(child) && child.type === Rating,
    );
  }) as ReactElement<RatingRowProps> | undefined;
  const modelLogo = descendants.find((candidate) => candidate.type === ModelSelectorLogo);
  const languageProgress = descendants.filter(
    (candidate): candidate is ReactElement<ProgressElementProps> =>
      (candidate.props as ProgressElementProps).role === 'progressbar',
  );
  const languagePills = descendants.filter(
    (candidate): candidate is ReactElement<LanguagePillProps> =>
      (candidate.props as LanguagePillProps)['data-slot'] === 'model-language',
  );
  const languageChecks = descendants.filter(
    (candidate): candidate is ReactElement<CheckIconProps> =>
      candidate.type === Check,
  );
  const languageCheckWrappers = descendants.filter(
    (candidate): candidate is ReactElement<SlotElementProps> =>
      (candidate.props as SlotElementProps)['data-slot'] ===
      'model-language-check',
  );
  const firstLanguageLabel = languagePills[0]
    ? collectElements(languagePills[0]).find((candidate) => {
        const props = candidate.props as SlotElementProps;
        return (
          candidate.type === 'span' &&
          collectText(candidate) === 'Chinese' &&
          props.className?.includes('text-foreground')
        );
      })
    : undefined;
  const text = collectText(element).replace(/\s+/g, ' ');

  expect(element.type).toBe(HoverCard);
  expect(rating?.props).toMatchObject({
    style: { width: 88 },
    value: 4,
    readOnly: true,
    itemStyles: {
      itemShapes: StickerStar,
      activeFillColor: '#f59e0b',
      inactiveFillColor: '#ffedd5',
    },
  });
  expect(modelLogo?.props).toMatchObject({ provider: 'qwen', className: 'size-4' });
  expect(text).toContain('Qwen3.7 Flash');
  expect(text).not.toContain('Kilobot rating');
  expect(text).toContain(
    'Best for fast Chinese customer conversations. It also handles everyday English support reliably.',
  );
  expect(text).toContain('Languages');
  expect(ratingIndex).toBeGreaterThan(-1);
  expect(identityIndex).toBeGreaterThan(ratingIndex);
  expect(descriptionIndex).toBeGreaterThan(identityIndex);
  expect(metricsIndex).toBeGreaterThan(descriptionIndex);
  expect(languagesIndex).toBeGreaterThan(metricsIndex);
  expect(ratingRow?.props.className).toContain('items-center');
  expect(collectText(ratingRow)).toContain('4.0');
  expect(collectText(ratingRow)).not.toContain('4.0 / 5');
  expect(text).toContain('Quality');
  expect(text).toContain('Speed');
  expect(text).toContain('Reasoning');
  expect(text).toContain('Value');
  expect(text).not.toContain('Language fit');
  expect(languageProgress).toHaveLength(0);
  expect(text).toContain('Chinese');
  expect(text).toContain('English');
  expect(languagePills).toHaveLength(2);
  expect(languagePills[0]?.props.className).not.toContain('bg-muted');
  expect(firstLanguageLabel).toBeDefined();
  expect(languageCheckWrappers).toHaveLength(2);
  expect(languageCheckWrappers[0]?.props.className).toContain('rounded');
  expect(languageCheckWrappers[0]?.props.className).toContain('bg-muted');
  expect(languageChecks).toHaveLength(2);
  expect(languageChecks[0]?.props.className).toContain('text-emerald-600');
});

test('leaves unknown historical models without an empty HoverCard', async () => {
  const { ModelScoreHoverCard } = await vi.importActual<HoverCardModule>('./ModelScoreHoverCard');
  const child = createElement('button', null, 'Historical model');

  expect(
    ModelScoreHoverCard({
      modelId: 'retired/model',
      modelLabel: 'Historical model',
      chefSlug: 'historical',
      children: child,
    }),
  ).toBe(child);
});
