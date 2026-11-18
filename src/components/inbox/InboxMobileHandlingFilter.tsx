import type { InboxHandlingFilter } from "../../../shared/inboxHandling";

export function InboxMobileHandlingFilter({
  value,
  onChange,
}: {
  value: InboxHandlingFilter;
  onChange: (value: InboxHandlingFilter) => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-2 px-4 py-2 text-sm">
      Handling
      <select
        className="min-h-11 rounded-md border border-border bg-background px-2"
        value={value}
        onChange={(event) =>
          onChange(event.currentTarget.value as InboxHandlingFilter)
        }
      >
        <option value="all">All</option>
        <option value="ai">AI handled</option>
        <option value="human">Non-AI handled</option>
      </select>
    </label>
  );
}
