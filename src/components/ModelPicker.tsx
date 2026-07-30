import { useCallback, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUpgradeModal } from '@/components/upgradeModalContext';
import {
  getPriceLevel,
  ModelPickerItem,
  type ModelPickerOption,
} from '@/components/ModelPickerItem';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '@/components/ai-elements/model-selector';
export type { ModelPickerOption } from '@/components/ModelPickerItem';

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
  const { openUpgradeModal } = useUpgradeModal();
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

  const handleUpgrade = useCallback(() => {
    setOpen(false);
    openUpgradeModal();
  }, [openUpgradeModal]);

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
              <ModelSelectorLogo
                provider={selectedModel.chefSlug}
                src={selectedModel.imageUrl}
                className="size-4 shrink-0"
              />
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
                    onUpgrade={handleUpgrade}
                  />
                ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
