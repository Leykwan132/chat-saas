import { memo, useCallback, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
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

export type ModelPickerOption = {
  value: string;
  label: string;
  creditCost: number;
  chef: string;
  chefSlug: string;
  isPopular: boolean;
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
    () => onSelect(option.value),
    [onSelect, option.value],
  );

  return (
    <ModelSelectorItem
      value={option.value}
      onSelect={handleSelect}
      className={cn(selected && 'bg-primary/8 text-primary')}
      data-checked={selected}
    >
      <ModelSelectorLogo provider={option.chefSlug} />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <ModelSelectorName className={cn('truncate', selected && 'font-semibold')}>
          {option.label}
        </ModelSelectorName>
        {option.isPopular && (
          <span className="shrink-0 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500 dark:bg-amber-400/20 dark:text-amber-400">
            Popular
          </span>
        )}
      </div>
      <span className={cn('shrink-0 text-xs', selected ? 'text-primary/70' : 'text-muted-foreground')}>
        {option.creditCost === 1 ? '1 credit' : `${option.creditCost} credits`} / msg
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
          variant="outline"
          className={cn('w-full justify-start gap-2 rounded-lg font-normal px-3', className)}
        >
          {selectedModel ? (
            <>
              <ModelSelectorLogo provider={selectedModel.chefSlug} className="size-4" />
              <ModelSelectorName className="text-left font-medium">{selectedModel.label}</ModelSelectorName>
            </>
          ) : (
            <ModelSelectorName className="text-muted-foreground text-left">
              Select a model
            </ModelSelectorName>
          )}
          <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
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
