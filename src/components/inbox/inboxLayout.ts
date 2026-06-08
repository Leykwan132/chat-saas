/** Shared header height for inbox columns so divider lines align across the row. */
export const INBOX_COLUMN_HEADER_HEIGHT = '3.15rem';

export const inboxColumnHeaderClassName =
  'flex h-[3.15rem] shrink-0 items-center border-b border-border';

/** Column shell: fills viewport height and clips overflow to inner scroll regions. */
export const inboxColumnClassName =
  'flex h-full min-h-0 flex-col overflow-hidden';

/** Scrollable body within a column (conversation list, filters, messages, details). */
export const inboxColumnScrollClassName =
  'min-h-0 flex-1 overflow-y-auto overscroll-y-contain';

/** Chat column: fixed header, scrollable messages, pinned input footer. */
export const inboxChatGridClassName =
  'grid h-full min-h-0 w-full overflow-hidden grid-rows-[3.15rem_minmax(0,1fr)_auto]';
