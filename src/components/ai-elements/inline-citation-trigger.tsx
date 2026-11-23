"use client";

import { Badge } from "@/components/ui/badge";
import { HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type InlineCitationCardTriggerProps = ComponentProps<typeof Badge> & {
  sources: string[];
  label?: string;
};

export const InlineCitationCardTrigger = ({
  sources,
  label,
  className,
  ...props
}: InlineCitationCardTriggerProps) => {
  const hostname = (() => {
    if (!sources[0]) return null;
    try {
      return new URL(sources[0]).hostname;
    } catch {
      return sources[0];
    }
  })();

  const displayLabel = label?.trim() || hostname;
  if (!displayLabel) return null;

  return (
    <HoverCardTrigger
      className={cn("inline-flex cursor-pointer ml-1", className)}
    >
      <Badge
        className="rounded-full text-[10px] leading-none"
        variant="secondary"
        {...props}
      >
        {displayLabel}
        {sources.length > 1 && ` +${sources.length - 1}`}
      </Badge>
    </HoverCardTrigger>
  );
};
