import { memo, useCallback, useMemo } from 'react';
import { DollarSign, LockKeyhole } from 'lucide-react';
import type { PlanKey } from '../../shared/planCatalog';
import {
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
} from '@/components/ai-elements/model-selector';
import { resolveModelPickerAction } from '@/components/modelPickerSelection';
import { cn } from '@/lib/utils';

type ModelAccessLabel = 'basic' | 'advanced' | 'popular' | 'latest';

const modelLabelText: Record<ModelAccessLabel, string> = {
  basic: 'Basic',
  advanced: 'Advanced',
  popular: 'Popular',
  latest: 'Latest',
};

const modelLabelClassName: Record<ModelAccessLabel, string> = {
  basic: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  advanced: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  popular: 'bg-amber-600 text-white font-semibold',
  latest: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

export type ModelPickerOption = {
  value: string;
  label: string;
  creditCost: number;
  chef: string;
  chefSlug: string;
  imageUrl?: string;
  isPopular: boolean;
  labels?: ModelAccessLabel[];
  requiredPlan?: PlanKey;
  accessible?: boolean;
};

export function getPriceLevel(creditCost: number): number {
  if (creditCost <= 1) return 1;
  if (creditCost <= 3) return 2;
  if (creditCost <= 8) return 3;
  return 4;
}

type ModelPickerItemProps = {
  option: ModelPickerOption;
  selected: boolean;
  onSelect: (value: string) => void;
  onUpgrade: () => void;
};

export const ModelPickerItem = memo(function ModelPickerItem({
  option,
  selected,
  onSelect,
  onUpgrade,
}: ModelPickerItemProps) {
  const handleSelect = useCallback(() => {
    if (resolveModelPickerAction(option.accessible) === 'upgrade') {
      onUpgrade();
      return;
    }
    onSelect(option.value);
  }, [onSelect, onUpgrade, option.accessible, option.value]);

  const labels = useMemo(
    () =>
      (option.labels ?? (option.isPopular ? ['popular'] : [])).filter(
        (label) =>
          label !== 'basic' && label !== 'advanced' && label !== 'latest',
      ),
    [option.labels, option.isPopular],
  );

  return (
    <ModelSelectorItem
      value={option.value}
      onSelect={handleSelect}
      aria-disabled={option.accessible === false}
      className={cn(
        '!rounded-md',
        selected && 'bg-primary/8 text-primary',
        option.accessible === false && 'opacity-70',
      )}
      data-checked={selected}
    >
      <ModelSelectorLogo provider={option.chefSlug} src={option.imageUrl} />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <ModelSelectorName
          className={cn(
            'min-w-0 flex-initial truncate',
            selected && 'font-semibold',
          )}
        >
          {option.label}
        </ModelSelectorName>
        {labels.map((label) => (
          <span
            key={label}
            className={cn(
              'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
              modelLabelClassName[label],
            )}
          >
            {modelLabelText[label]}
          </span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900/60">
          {[1, 2, 3, 4].map((level) => (
            <DollarSign
              key={level}
              className={cn(
                '-mx-0.5 size-3 first:ml-0 last:mr-0',
                level <= getPriceLevel(option.creditCost)
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-300 dark:text-zinc-700/60',
              )}
            />
          ))}
        </span>
        {option.accessible === false ? (
          <span className="inline-flex items-center text-xs text-muted-foreground">
            <LockKeyhole className="size-3" />
          </span>
        ) : null}
        <span
          className={cn(
            'text-xs',
            selected ? 'text-primary/70' : 'text-muted-foreground',
          )}
        >
          {option.creditCost === 0
            ? 'Free'
            : `${option.creditCost === 1 ? '1 credit' : `${option.creditCost} credits`} / msg`}
        </span>
      </div>
    </ModelSelectorItem>
  );
});
