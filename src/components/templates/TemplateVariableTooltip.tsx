import type { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type TemplateVariableTooltipProps = {
  children: ReactNode;
  label: string;
  example: string;
  className?: string;
};

export function TemplateVariableTooltip({
  children,
  label,
  example,
  className,
}: TemplateVariableTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'pointer-events-auto cursor-text text-primary underline decoration-dotted decoration-primary/60 underline-offset-3',
            className,
          )}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-64 items-start text-left">
        <div className="flex flex-col gap-1">
          <span className="font-semibold">{label}</span>
          <span className="font-normal opacity-85">Example: {example}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
