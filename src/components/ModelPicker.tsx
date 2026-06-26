import { memo, useCallback, useMemo, useState } from 'react';
import { ChevronDown, LockKeyhole, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '@/components/ai-elements/model-selector';
import type { PlanKey } from '../../shared/planCatalog';

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
  isPopular: boolean;
  labels?: ModelAccessLabel[];
  requiredPlan?: PlanKey;
  accessible?: boolean;
};


type ModelPickerItemProps = {
  option: ModelPickerOption;
  selected: boolean;
  onSelect: (value: string) => void;
};

const getPriceLevel = (creditCost: number): number => {
  if (creditCost === 0) return 1;
  if (creditCost <= 1) return 1;
  if (creditCost <= 3) return 2;
  if (creditCost <= 8) return 3;
  return 4;
};

const ModelPickerItem = memo(function ModelPickerItem({
  option,
  selected,
  onSelect,
}: ModelPickerItemProps) {
  const handleSelect = useCallback(
    () => {
      if (option.accessible === false) return;
      onSelect(option.value);
    },
    [onSelect, option.accessible, option.value],
  );

  const labels = useMemo(() => {
    return (option.labels ?? (option.isPopular ? ['popular'] : []))
      .filter((label) => label !== 'basic' && label !== 'advanced' && label !== 'latest');
  }, [option.labels, option.isPopular]);

  return (
    <ModelSelectorItem
      value={option.value}
      onSelect={handleSelect}
      disabled={option.accessible === false}
      className={cn(
        '!rounded-md',
        selected && 'bg-primary/8 text-primary',
        option.accessible === false && 'opacity-70',
      )}
      data-checked={selected}
    >
      <ModelSelectorLogo provider={option.chefSlug} />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <ModelSelectorName className={cn('truncate flex-initial min-w-0', selected && 'font-semibold')}>
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
        {/* Money/Price Level Indicator Pill */}
        <span className="inline-flex items-center bg-zinc-100 dark:bg-zinc-900/60 px-1 py-0.5 rounded-md">
          {[1, 2, 3, 4].map((i) => (
            <DollarSign
              key={i}
              className={cn(
                'size-3 -mx-0.5 first:ml-0 last:mr-0',
                i <= getPriceLevel(option.creditCost)
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-300 dark:text-zinc-700/60',
              )}
            />
          ))}
        </span>
        {option.accessible === false && (
          <span className="inline-flex items-center text-xs text-muted-foreground">
            <LockKeyhole className="size-3" />
          </span>
        )}
        <span className={cn('text-xs', selected ? 'text-primary/70' : 'text-muted-foreground')}>
          {option.creditCost === 0 ? 'Free' : `${option.creditCost === 1 ? '1 credit' : `${option.creditCost} credits`} / msg`}
        </span>
      </div>
    </ModelSelectorItem>
  );
});

type ModelPickerProps = {
  models: ModelPickerOption[] | undefined;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
};

export function ModelPicker({
  models,
  value,
  onChange,
  className,
  disabled = false,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [showOnlyPopular, setShowOnlyPopular] = useState(false);
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<number | null>(null);

  const selectedModel = useMemo(
    () => models?.find((model) => model.value === value),
    [models, value],
  );

  const filteredModels = useMemo(() => {
    if (!models) return [];
    let result = models;
    if (showOnlyAvailable) {
      result = result.filter((model) => model.accessible !== false);
    }
    if (showOnlyPopular) {
      result = result.filter((model) => model.isPopular || model.labels?.includes('popular'));
    }
    if (selectedPriceLevel !== null) {
      result = result.filter((model) => getPriceLevel(model.creditCost) === selectedPriceLevel);
    }
    return result;
  }, [models, showOnlyAvailable, showOnlyPopular, selectedPriceLevel]);

  const chefs = useMemo(
    () => [...new Set((filteredModels ?? []).map((model) => model.chef))],
    [filteredModels],
  );

  const handleSelect = useCallback(
    (nextValue: string) => {
      onChange(nextValue);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger
        disabled={disabled || !models || models.length === 0}
        asChild
      >
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 min-h-9 w-full justify-start gap-2 rounded-md border border-transparent bg-input/50 px-3.5 py-0 text-sm font-normal shadow-none',
            'hover:bg-input/50 hover:text-foreground dark:bg-input/50 dark:hover:bg-input/50 dark:aria-expanded:bg-input/50',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30',
            className,
          )}
        >
          {selectedModel ? (
            <>
              <ModelSelectorLogo provider={selectedModel.chefSlug} className="size-4 shrink-0" />
              <ModelSelectorName className="min-w-0 flex-1 truncate text-left font-normal">
                {selectedModel.label}
              </ModelSelectorName>
            </>
          ) : (
            <ModelSelectorName className="min-w-0 flex-1 truncate text-left text-muted-foreground">
              Select a model
            </ModelSelectorName>
          )}
          <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground opacity-60" />
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent className="p-0 sm:max-w-[627px]">
        <ModelSelectorInput placeholder="Search models..." />
        
        {/* Filter Beans Row */}
        <div className="flex flex-wrap items-center gap-1.5 px-1 pt-2.5 pb-2.5 border-b border-border/40">
          <button
            type="button"
            onClick={() => setShowOnlyAvailable((prev) => !prev)}
            className={cn(
              'h-6 text-[11px] font-medium px-2.5 rounded-full border transition-all cursor-pointer select-none',
              showOnlyAvailable
                ? 'bg-zinc-950 border-zinc-950 text-white dark:bg-white dark:border-white dark:text-zinc-950 font-semibold'
                : 'bg-transparent border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5',
            )}
          >
            Show available
          </button>
          
          <button
            type="button"
            onClick={() => setShowOnlyPopular((prev) => !prev)}
            className={cn(
              'h-6 text-[11px] font-medium px-2.5 rounded-full border transition-all cursor-pointer select-none',
              showOnlyPopular
                ? 'bg-zinc-950 border-zinc-950 text-white dark:bg-white dark:border-white dark:text-zinc-950 font-semibold'
                : 'bg-transparent border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5',
            )}
          >
            Popular
          </button>

          <span className="h-4 w-px bg-border/60 mx-1 shrink-0" />

          {([1, 2, 3, 4] as const).map((level) => {
            const label = '$'.repeat(level);
            const isActive = selectedPriceLevel === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedPriceLevel((prev) => (prev === level ? null : level))}
                className={cn(
                  'h-6 text-[11px] font-semibold px-2.5 rounded-full border transition-all cursor-pointer select-none tracking-wider',
                  isActive
                    ? 'bg-zinc-950 border-zinc-950 text-white dark:bg-white dark:border-white dark:text-zinc-950'
                    : 'bg-transparent border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <ModelSelectorList className="max-h-[min(420px,50vh)]">
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {chefs.map((chef) => (
            <ModelSelectorGroup heading={chef} key={chef}>
              {filteredModels
                .filter((model) => model.chef === chef)
                .map((option) => (
                  <ModelPickerItem
                    key={option.value}
                    option={option}
                    selected={value === option.value}
                    onSelect={handleSelect}
                  />
                ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
