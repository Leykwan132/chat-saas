export function GoogleCalendarSourceBadge({
  origin,
}: {
  origin?: "google" | "kilobot";
}) {
  if (origin !== "kilobot") return null;
  return (
    <span className="shrink-0 rounded bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
      Kilobot
    </span>
  );
}
