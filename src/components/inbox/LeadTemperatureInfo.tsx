import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  getLeadTemperatureStyle,
  LEAD_TEMPERATURE_DESCRIPTIONS,
  LEAD_TEMPERATURE_TAGS,
} from '@/lib/leadTemperature';
import { cn } from '@/lib/utils';

export function LeadTemperatureInfo() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="shrink-0 rounded-full p-[0.1125rem] text-muted-foreground/70 transition-colors hover:text-foreground"
          aria-label="Lead temperature information"
        >
          <Info className="size-[0.7875rem]" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        className="flex w-52 max-w-none flex-col items-stretch gap-2.5 p-2.5 text-left text-xs font-normal normal-case leading-snug"
      >
        {LEAD_TEMPERATURE_TAGS.map((temperature) => {
          const style = getLeadTemperatureStyle(temperature);
          const Icon = style.icon;

          return (
            <div key={temperature} className="flex w-full flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Icon className={cn('size-3.5 shrink-0', style.iconClass)} />
                <span>{temperature}</span>
              </div>
              <p className="pl-5 text-background/80">
                {LEAD_TEMPERATURE_DESCRIPTIONS[temperature]}
              </p>
            </div>
          );
        })}
      </TooltipContent>
    </Tooltip>
  );
}
