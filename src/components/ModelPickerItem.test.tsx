import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { expect, test, vi } from 'vitest';
import { ModelScoreHoverCard } from '@/components/ModelScoreHoverCard';
import { ModelSelectorItem } from '@/components/ai-elements/model-selector';
import type { ModelPickerOption } from '@/components/ModelPickerItem';

type ModelPickerItemModule = {
  ModelPickerItemView?: (props: {
    option: ModelPickerOption;
    selected: boolean;
    onSelect: (value: string) => void;
    onUpgrade: () => void;
  }) => ReactElement;
};

function collectElements(node: ReactNode): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(collectElements);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node, ...collectElements(node.props.children)];
}

function findModelSelectorItem(node: ReactNode) {
  return collectElements(node).find(
    (candidate) => candidate.type === ModelSelectorItem,
  ) as ReactElement<{ onSelect: () => void }> | undefined;
}

const qwenOption: ModelPickerOption = {
  value: 'qwen/qwen3.7-flash',
  label: 'Qwen3.7 Flash',
  creditCost: 0.5,
  chef: 'Qwen',
  chefSlug: 'qwen',
  isPopular: false,
  labels: ['advanced', 'latest'],
  accessible: true,
};

test('forwards model identity and preserves direct selection', async () => {
  const module = await vi.importActual<ModelPickerItemModule>('./ModelPickerItem');
  const onSelect = vi.fn();
  const onUpgrade = vi.fn();

  expect(module.ModelPickerItemView).toBeTypeOf('function');
  if (module.ModelPickerItemView === undefined) return;

  const element = module.ModelPickerItemView({
    option: qwenOption,
    selected: false,
    onSelect,
    onUpgrade,
  });
  const item = findModelSelectorItem(element);

  expect(element.type).toBe(ModelScoreHoverCard);
  expect(element.props).toMatchObject({
    modelId: 'qwen/qwen3.7-flash',
    modelLabel: 'Qwen3.7 Flash',
    chefSlug: 'qwen',
  });
  item?.props.onSelect();
  expect(onSelect).toHaveBeenCalledWith('qwen/qwen3.7-flash');
  expect(onUpgrade).not.toHaveBeenCalled();
});

test('preserves the upgrade action for inaccessible models', async () => {
  const module = await vi.importActual<ModelPickerItemModule>('./ModelPickerItem');
  const onSelect = vi.fn();
  const onUpgrade = vi.fn();

  expect(module.ModelPickerItemView).toBeTypeOf('function');
  if (module.ModelPickerItemView === undefined) return;

  const element = module.ModelPickerItemView({
    option: { ...qwenOption, accessible: false },
    selected: false,
    onSelect,
    onUpgrade,
  });
  const item = findModelSelectorItem(element);

  item?.props.onSelect();
  expect(onUpgrade).toHaveBeenCalledOnce();
  expect(onSelect).not.toHaveBeenCalled();
});
