import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { PencilLine, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { BookingDetailsPanelSkeleton } from '@/components/booking/BookingDetailsPanelSkeleton';
import { CalendarEventDeleteDialog } from '@/components/calendar/CalendarEventDeleteDialog';
import { CalendarEventDetailsEditBody } from '@/components/calendar/CalendarEventDetailsEditBody';
import {
  EventDetailsBody,
  type AppointmentDetails,
} from '@/components/calendar/CalendarEventDetailsBody';
import {
  buildCustomFieldResponses,
  combineDateTime,
  formStateFromEvent,
  getAllDayBounds,
  type CalendarEventForEditing,
  type EventEditFormState,
  type TeamUserOption,
} from '@/components/calendar/calendarEventEditModel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

type CalendarEventDetailsDialogProps = {
  eventId: Id<'calendarEvents'> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  onDeleteSuccess?: () => void;
};

export function CalendarEventDetailsDialog({
  eventId,
  open,
  onOpenChange,
  canEdit,
  onDeleteSuccess,
}: CalendarEventDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<EventEditFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const updateEvent = useAction(api.calendarEvents.update);
  const removeEvent = useAction(api.calendarEvents.remove);

  const details = useQuery(
    api.calendarEvents.getAppointmentDetails,
    open && eventId ? { eventId } : 'skip',
  ) as AppointmentDetails | null | undefined;
  const eventData = useQuery(
    api.calendarEvents.getEventForEditing,
    open && eventId ? { eventId } : 'skip',
  ) as CalendarEventForEditing | null | undefined;
  const teamUsers = useQuery(api.users.getUsers, {}) as TeamUserOption[] | undefined;

  const loading = open && eventId !== null && details === undefined;
  const title = details ? details.title : 'Appointment details';
  const editFormState =
    isEditing && eventData ? formState ?? formStateFromEvent(eventData) : formState;
  const editLoading =
    isEditing &&
    (details === undefined ||
      eventData === undefined ||
      teamUsers === undefined ||
      editFormState === null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsEditing(false);
      setFormState(null);
      setDeleteDialogOpen(false);
    }
    onOpenChange(nextOpen);
  };

  const updateForm = (patch: Partial<EventEditFormState>) => {
    setFormState((current) => {
      const base = current ?? (eventData ? formStateFromEvent(eventData) : null);
      return base ? { ...base, ...patch } : null;
    });
  };

  const updateCollectedField = (key: string, value: string) => {
    setFormState((current) => {
      const base = current ?? (eventData ? formStateFromEvent(eventData) : null);
      if (!base) return null;
      return {
        ...base,
        collectedFields: {
          ...base.collectedFields,
          [key]: value,
        },
      };
    });
  };

  const handleStartEdit = () => {
    if (eventData) {
      setFormState(formStateFromEvent(eventData));
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormState(null);
  };

  const handleSaveEvent = async () => {
    if (!eventId || !editFormState || !details) return;
    if (!editFormState.title.trim()) {
      toast.error('Event title is required');
      return;
    }
    if (!editFormState.customerId || !editFormState.assignedUserId) {
      toast.error('Customer and team member are required');
      return;
    }

    const timeRange = editFormState.allDay
      ? getAllDayBounds(editFormState.date, editFormState.timeZone)
      : {
          startAt: combineDateTime(
            editFormState.date,
            editFormState.startTime,
            editFormState.timeZone,
          ),
          endAt: combineDateTime(
            editFormState.date,
            editFormState.endTime,
            editFormState.timeZone,
          ),
        };
    const { startAt, endAt } = timeRange;
    if (startAt === null || endAt === null) {
      toast.error('Enter a valid start and end time');
      return;
    }
    if (endAt <= startAt) {
      toast.error('End time must be after start time');
      return;
    }

    setIsSaving(true);
    try {
      await updateEvent({
        eventId,
        title: editFormState.title,
        description: editFormState.description || undefined,
        link: editFormState.link || undefined,
        startAt,
        endAt,
        timeZone: editFormState.timeZone,
        allDay: editFormState.allDay,
        startDate: editFormState.allDay ? editFormState.date : undefined,
        endDate: editFormState.allDay ? editFormState.date : undefined,
        customerId: editFormState.customerId as Id<'customers'>,
        assignedUserId: editFormState.assignedUserId as Id<'users'>,
        attendeeUserIds: editFormState.attendeeUserIds as Id<'users'>[],
        customFieldResponses: buildCustomFieldResponses(
          editFormState.collectedFields,
          details.serviceFields,
        ),
        remarks: editFormState.remarks.trim(),
      });
      toast.success('Event updated');
      setIsEditing(false);
      setFormState(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventId) return;
    setIsDeleting(true);
    try {
      await removeEvent({ eventId });
      toast.success('Event deleted');
      setDeleteDialogOpen(false);
      onDeleteSuccess?.();
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[63rem]" showCloseButton={false}>
          <DialogHeader className="sr-only"><DialogTitle>{title}</DialogTitle></DialogHeader>
          <div className="max-h-[min(82vh,760px)] overflow-y-auto px-10 py-8">
            {loading || editLoading ? (
              <BookingDetailsPanelSkeleton variant="inline" />
            ) : isEditing && editFormState && details && teamUsers ? (
              <CalendarEventDetailsEditBody
                form={editFormState}
                serviceFields={details.serviceFields}
                teamUsers={teamUsers}
                actions={
                  canEdit && eventId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                      aria-label="Delete event"
                    >
                      <Trash2 />
                    </Button>
                  ) : null
                }
                onFormChange={updateForm}
                onCollectedFieldChange={updateCollectedField}
              />
            ) : details ? (
              <EventDetailsBody
                details={details}
                actions={
                  canEdit && eventId ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleStartEdit}
                        aria-label="Update event"
                      >
                        <PencilLine />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                        aria-label="Delete event"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">Appointment not found.</p>
            )}
          </div>

          <DialogFooter className="border-t border-border px-10 py-5">
            <div className="flex w-full items-center justify-end gap-2">
              {isEditing ? (
                <>
                  <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button type="button" disabled={isSaving || !canEdit} onClick={() => void handleSaveEvent()}>
                    {isSaving ? <Spinner /> : null}
                    Save
                  </Button>
                </>
              ) : (
                <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                  Close
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CalendarEventDeleteDialog eventId={eventId} open={deleteDialogOpen} isDeleting={isDeleting} onOpenChange={setDeleteDialogOpen} onConfirm={() => void handleDeleteEvent()} />
    </>
  );
}
