export function SidebarScrollCue() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-b from-transparent to-sidebar group-data-[collapsible=icon]:hidden"
    />
  );
}
