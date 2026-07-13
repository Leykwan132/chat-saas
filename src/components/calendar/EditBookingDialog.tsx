import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { EditBookingForm } from './EditBookingForm';
import { EditBookingFormSkeleton } from './EditBookingFormSkeleton';
import {
  buildCustomFieldResponses,
  bookingMutationErrorMessage,
  customerDetailServiceFields,
  eventBounds,
  formStateFromEvent,
  resolveAppointmentBookingEditStatus,
  resolveEditBookingDialogContent,
  type CalendarEvent,
  type CustomerOption,
  type EventFormState,
} from './editBookingModel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../../shared/permissions';
import { canEditCalendarEvent } from '@/lib/calendarEditPolicy';
import { getClientTimeZone, normalizeCalendarTimeZone } from '@/lib/calendarTimeUtils';

type Props = {
  eventId: Id<'calendarEvents'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  onSuccess?: () => void;
  onDeleteSuccess?: () => void;
  autoFocusRemarks?: boolean;
  onMarkCompleted?: () => void;
};

export function EditBookingDialog({
  eventId,
  open,
  onOpenChange,
  agentId: _agentId,
  onSuccess,
  onDeleteSuccess,
  autoFocusRemarks,
  onMarkCompleted,
}: Props) {
  const { can } = usePermissions();
  const canManageCalendar = can(Permission.CALENDAR_MANAGE);
  const currentUser = useQuery(api.users.currentUser);
  const activeTeam = useQuery(api.teams.getActiveTeam);
  const teamUsers = useQuery(api.users.getUsers, {});
  const customerOptions = useQuery(api.calendarEvents.listCustomerOptions, {});
  const eventData = useQuery(api.calendarEvents.getEventForEditing, open ? { eventId } : 'skip') as CalendarEvent | null | undefined;
  const appointmentDetails = useQuery(api.calendarEvents.getAppointmentDetails, open ? { eventId } : 'skip');
  const appointmentStatusResult = useQuery(
    api.appointmentBooking.editBookingStatus.getEditBookingStatus,
    open ? { bookingId: eventId } : 'skip',
  );
  const updateEvent = useMutation(api.calendarEvents.update);
  const removeEvent = useMutation(api.calendarEvents.remove);
  const updateBookingStatus = useMutation(api.appointmentBooking.statusTransition.updateBookingStatus);
  const displayTimeZone = useMemo(
    () => activeTeam?.timeZone ? normalizeCalendarTimeZone(activeTeam.timeZone) : getClientTimeZone(),
    [activeTeam?.timeZone],
  );
  const [formState, setFormState] = useState<EventFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isAppointment = Boolean(appointmentDetails?.isAppointmentBooking ?? eventData?.appointmentServiceId ?? eventData?.bookingSource === 'ai');
  const appointmentLoading = open && appointmentDetails === undefined;
  const appointmentStatus = resolveAppointmentBookingEditStatus(appointmentStatusResult);

  useEffect(() => {
    if (eventData && !formState && (!isAppointment || appointmentStatus.kind === 'editable')) {
      setFormState(formStateFromEvent(eventData, displayTimeZone, isAppointment && appointmentStatus.kind === 'editable' ? appointmentStatus.status : undefined));
    }
  }, [appointmentStatus, displayTimeZone, eventData, formState, isAppointment]);

  useEffect(() => {
    if (!open) setFormState(null);
  }, [open]);

  const canEditEvent = eventData ? canEditCalendarEvent({ canManageCalendar, endAt: eventData.endAt }) : canManageCalendar;
  const statusLoading = isAppointment && appointmentStatus.kind === 'loading';
  const statusError = isAppointment && appointmentStatus.kind === 'missing'
    ? 'Booking status is unavailable. This appointment has no booking session.'
    : isAppointment && appointmentStatus.kind === 'unsupported'
      ? 'Booking status cannot be edited right now. Finish the active booking flow and try again.'
      : null;
  const content = resolveEditBookingDialogContent({ open, eventData, statusLoading, statusError, formState });
  const loading = content === 'loading';
  const updateForm = (patch: Partial<EventFormState>) => setFormState((current) => current ? { ...current, ...patch } : null);
  const updateCollectedField = (key: string, value: string) => setFormState((current) => current ? {
    ...current,
    collectedFields: { ...current.collectedFields, [key]: value },
  } : null);

  const handleSaveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState || !canEditEvent) return;
    if (!formState.title.trim()) return void toast.error('Event title is required');
    if (!formState.customerId || !formState.assignedUserId) return void toast.error('Select a customer and assigned team member');
    const timeZone = formState.timeZone || displayTimeZone;
    const { startAt, endAt } = eventBounds(formState, timeZone);
    if (startAt === null || endAt === null) return void toast.error('Enter a valid start and end time');
    if (endAt <= startAt) return void toast.error('End time must be after start time');
    setIsSaving(true);
    try {
      await updateEvent({
        eventId,
        title: formState.title,
        description: formState.description || undefined,
        link: formState.link || undefined,
        startAt,
        endAt,
        timeZone,
        allDay: formState.allDay,
        startDate: formState.allDay ? formState.date : undefined,
        endDate: formState.allDay ? formState.date : undefined,
        customerId: formState.customerId as Id<'customers'>,
        assignedUserId: formState.assignedUserId as Id<'users'>,
        attendeeUserIds: formState.attendeeUserIds as Id<'users'>[],
        ...(isAppointment ? {
          customFieldResponses: buildCustomFieldResponses(formState.collectedFields, appointmentDetails?.serviceFields ?? []),
          remarks: formState.remarks.trim(),
        } : {}),
      });
      if (isAppointment && formState.status && appointmentStatus.kind === 'editable' && formState.status !== appointmentStatus.status) {
        await updateBookingStatus({ bookingId: eventId, status: formState.status });
      }
      toast.success('Event updated');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(bookingMutationErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    setIsDeleting(true);
    try {
      await removeEvent({ eventId });
      toast.success('Event deleted');
      setDeleteDialogOpen(false);
      onDeleteSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(bookingMutationErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const teamUserRows = teamUsers?.length ? teamUsers : currentUser ? [currentUser] : [];
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={!onMarkCompleted} className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><DialogTitle className="truncate">Edit Booking</DialogTitle><DialogDescription className="sr-only">Edit calendar event booking details</DialogDescription></div>
              {onMarkCompleted ? <Button type="button" size="sm" className="shrink-0" onClick={onMarkCompleted}>Mark as completed</Button> : null}
            </div>
          </DialogHeader>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {content === 'loading' ? <EditBookingFormSkeleton /> : content === 'error' ? (
              <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{statusError}</div>
            ) : content === 'form' && formState ? (
              <EditBookingForm
                state={formState}
                update={updateForm}
                updateCollectedField={updateCollectedField}
                onSubmit={handleSaveEvent}
                teamUsers={teamUserRows}
                customers={(customerOptions ?? []) as CustomerOption[]}
                serviceFields={customerDetailServiceFields(appointmentDetails?.serviceFields ?? [])}
                appointment={isAppointment}
                appointmentLoading={appointmentLoading}
                disabled={!canEditEvent}
                autoFocusRemarks={autoFocusRemarks}
              />
            ) : <p className="text-sm text-muted-foreground">Event not found.</p>}
          </div>
          <DialogFooter className="shrink-0 flex-row items-center justify-end gap-1.5 border-t border-border px-6 py-4">
            {canEditEvent && formState ? <Button type="button" variant="ghost" size="icon" className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteDialogOpen(true)} aria-label="Delete event"><Trash2 className="size-4" /></Button> : null}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{!canEditEvent || loading ? 'Close' : 'Cancel'}</Button>
            {canEditEvent && formState ? <Button type="submit" form="edit-booking-form" disabled={isSaving}>{isSaving ? <Spinner className="mr-2 size-4" /> : null}Save Changes</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete event?</DialogTitle><DialogDescription>This removes the appointment from the shared team calendar.</DialogDescription></DialogHeader>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button><Button type="button" variant="destructive" onClick={handleDeleteEvent} disabled={isDeleting}>{isDeleting ? <Spinner className="mr-2 size-4" /> : null}Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
