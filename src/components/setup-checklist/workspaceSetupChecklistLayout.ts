export const workspaceSetupChecklistRootClassName =
  'group-data-[collapsible=icon]:hidden relative px-[0.675rem] pt-[0.1125rem] pb-[0.45rem]';

export const workspaceSetupChecklistPanelClassName =
  'absolute bottom-full left-[0.675rem] z-50 mb-2 w-[min(20rem,calc(100vw-2rem))] sm:w-80';

export const workspaceSetupChecklistTriggerClassName =
  'h-9 w-full items-center justify-between gap-2 overflow-visible rounded-full border border-transparent bg-background pl-3.5 pr-5 text-[0.7875rem] font-medium leading-none text-foreground shadow-none backdrop-blur transition-colors hover:bg-background/95';

export const workspaceSetupChecklistAccentBorderStyle = {
  background:
    'linear-gradient(var(--color-background), var(--color-background)) padding-box, linear-gradient(135deg, #34d399, #38bdf8, #a78bfa, #f472b6) border-box',
} as const;
