"use client";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import { Popover as PopoverPrimitive } from "radix-ui";
import * as React from "react";

/* ─── Popover wrappers ─── */

function ModelSelector({
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return (
    <PopoverPrimitive.Root data-slot="model-selector" {...props}>
      {children}
    </PopoverPrimitive.Root>
  );
}

function ModelSelectorTrigger({
  className,
  asChild,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="model-selector-trigger"
      className={cn(
        "inline-flex items-center justify-between gap-2 rounded-3xl border border-border bg-background px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50",
        className
      )}
      asChild={asChild}
      {...props}
    />
  );
}

function ModelSelectorContent({
  className,
  children,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="model-selector-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-[260px] origin-(--radix-popover-content-transform-origin) rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      >
        <Command className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-popover">
          {children}
        </Command>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

/* ─── Command wrappers ─── */

function ModelSelectorInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandInput>) {
  return (
    <CommandInput
      data-slot="model-selector-input"
      className={cn(
        "flex h-9 w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function ModelSelectorList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandList>) {
  return (
    <CommandList
      data-slot="model-selector-list"
      className={cn(
        "max-h-[300px] overflow-y-auto overflow-x-hidden px-1 pb-1",
        className
      )}
      {...props}
    >
      {children}
    </CommandList>
  );
}

function ModelSelectorEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandEmpty>) {
  return (
    <CommandEmpty
      data-slot="model-selector-empty"
      className={cn(
        "py-4 text-center text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function ModelSelectorGroup({
  className,
  heading,
  children,
  ...props
}: React.ComponentProps<typeof CommandGroup>) {
  return (
    <CommandGroup
      data-slot="model-selector-group"
      heading={heading}
      className={cn(
        "overflow-hidden px-1 py-1.5 text-foreground",
        "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </CommandGroup>
  );
}

function ModelSelectorItem({
  className,
  children,
  onSelect,
  value,
  ...props
}: React.ComponentProps<typeof CommandItem> & {
  onSelect?: (value: string) => void;
  value: string;
}) {
  return (
    <CommandItem
      data-slot="model-selector-item"
      value={value}
      onSelect={onSelect}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </CommandItem>
  );
}

/* ─── Display helpers ─── */

const PROVIDER_COLORS: Record<string, string> = {
  google: "#4285F4",
  openai: "#10A37F",
  anthropic: "#D4A574",
  meta: "#0081FB",
  deepseek: "#4D6BFA",
  mistral: "#FF7000",
  alibaba: "#FF6A00",
  cohere: "#D4A574",
  xai: "#000000",
  amazon: "#FF9900",
  default: "#6B7280",
};

function ModelSelectorLogo({
  provider,
  className,
}: {
  provider: string;
  className?: string;
}) {
  const color = PROVIDER_COLORS[provider] ?? PROVIDER_COLORS.default;
  const initial = provider.charAt(0).toUpperCase();

  return (
    <span
      data-slot="model-selector-logo"
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
        className
      )}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );
}

function ModelSelectorLogoGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      data-slot="model-selector-logo-group"
      className={cn("ml-1 flex -space-x-1", className)}
    >
      {children}
    </span>
  );
}

function ModelSelectorName({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      data-slot="model-selector-name"
      className={cn("truncate text-sm font-medium", className)}
    >
      {children}
    </span>
  );
}

export {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
};
