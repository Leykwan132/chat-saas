import { memo, useCallback, useMemo, useState } from 'react';
import { ChevronDown, LockKeyhole } from 'lucide-react';
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
import { PLAN_CATALOG, type PlanKey } from '../../shared/planCatalog';

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
  popular: 'bg-amber-400/15 text-amber-600 dark:text-amber-300',
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
  const requiredPlanName = option.requiredPlan ? PLAN_CATALOG[option.requiredPlan]?.name : null;

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
        {(option.labels ?? (option.isPopular ? ['popular'] : [])).map((label) => (
          <span
            key={label}
            className={cn(
              'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              modelLabelClassName[label],
            )}
          >
            {modelLabelText[label]}
          </span>
        ))}
      </div>
      {option.accessible === false && requiredPlanName && (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <LockKeyhole className="size-3" />
          {requiredPlanName}
        </span>
      )}
      <span className={cn('shrink-0 text-xs', selected ? 'text-primary/70' : 'text-muted-foreground')}>
        {option.creditCost === 0 ? 'Free' : `${option.creditCost === 1 ? '1 credit' : `${option.creditCost} credits`} / msg`}
      </span>
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

  const selectedModel = useMemo(
    () => models?.find((model) => model.value === value),
    [models, value],
  );

  const chefs = useMemo(
    () => [...new Set((models ?? []).map((model) => model.chef))],
    [models],
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
            'hover:bg-input/50 hover:text-foreground',
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
        <ModelSelectorList className="max-h-[min(420px,50vh)]">
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {chefs.map((chef) => (
            <ModelSelectorGroup heading={chef} key={chef}>
              {(models ?? [])
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
