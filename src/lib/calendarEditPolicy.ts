export function canEditCalendarEvent({
  canManageCalendar,
  viewerCanMutate,
  externalOrigin,
  externalOwnerUserId,
  viewerUserId,
  externalCanEdit,
}: {
  canManageCalendar: boolean;
  endAt?: number;
  viewerCanMutate?: boolean;
  externalOrigin?: "google" | "kilobot";
  externalOwnerUserId?: string;
  viewerUserId?: string;
  externalCanEdit?: boolean;
}) {
  if (viewerCanMutate === false) return false;
  if (externalOrigin === "google") {
    return (
      viewerUserId !== undefined &&
      externalOwnerUserId === viewerUserId &&
      externalCanEdit !== false
    );
  }
  return canManageCalendar;
}
