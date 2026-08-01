/**
 * Inbox filter sidebar styles — mirrors the app sidebar at 90% scale
 * (10% smaller width, padding, icons, and font sizes).
 */
export const INBOX_SIDEBAR_WIDTH = '14.4rem';
export const INBOX_SIDEBAR_ICON_RAIL_WIDTH = '2.7rem';

export const inboxSidebarGroupLabelClassName =
  'mb-[0.225rem] flex h-[1.8rem] shrink-0 items-center px-[0.675rem] text-[0.675rem] font-medium text-muted-foreground';

export const inboxSidebarItemClassName =
  'flex h-[2.025rem] w-full items-center gap-[0.45rem] overflow-hidden rounded-xl px-[0.675rem] py-[0.45rem] text-left text-[0.7875rem] ring-sidebar-ring outline-hidden transition-colors';

export const inboxSidebarItemActiveClassName =
  'bg-sidebar-accent font-medium text-sidebar-accent-foreground';

export const inboxSidebarItemInactiveClassName =
  'text-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';

export const inboxSidebarIconSlotClassName =
  'flex size-[1.125rem] shrink-0 items-center justify-center [&>svg]:size-[1.125rem]';

export const inboxSidebarCountClassName =
  'pointer-events-none shrink-0 rounded-xl px-[0.225rem] text-[0.675rem] font-medium tabular-nums text-muted-foreground';

export const inboxSidebarSectionClassName = 'px-[0.45rem] py-[0.45rem]';

export const inboxSidebarToggleButtonClassName =
  'size-[1.8rem] shrink-0 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground';

export const inboxSidebarToggleIconClassName = 'size-[1.125rem]';
