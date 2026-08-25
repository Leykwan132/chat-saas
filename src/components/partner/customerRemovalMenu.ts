export function preventCustomerRowClick(
  event: Pick<Event, "stopPropagation">,
): void {
  event.stopPropagation();
}
