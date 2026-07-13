# Task 3 Re-review Package

```diff
diff --git a/src/components/calendar/EditBookingDialog.tsx b/src/components/calendar/EditBookingDialog.tsx
index a1141bf5..a71f5d00 100644
--- a/src/components/calendar/EditBookingDialog.tsx
+++ b/src/components/calendar/EditBookingDialog.tsx
@@ -1,318 +1,30 @@
 import React, { useEffect, useMemo, useState } from 'react';
 import { useMutation, useQuery } from 'convex/react';
-import { format } from 'date-fns';
-import { Calendar as CalendarIcon, Trash2 } from 'lucide-react';
+import { Trash2 } from 'lucide-react';
 import { toast } from 'sonner';
-
 import { api } from '../../../convex/_generated/api';
-import type { Doc, Id } from '../../../convex/_generated/dataModel';
-import { Button } from '@/components/ui/button';
-import { Calendar } from '@/components/ui/calendar';
+import type { Id } from '../../../convex/_generated/dataModel';
+import { EditBookingForm } from './EditBookingForm';
+import { EditBookingFormSkeleton } from './EditBookingFormSkeleton';
 import {
-  Dialog,
-  DialogContent,
-  DialogDescription,
-  DialogFooter,
-  DialogHeader,
-  DialogTitle,
-} from '@/components/ui/dialog';
-import { Input } from '@/components/ui/input';
-import { Label } from '@/components/ui/label';
-import { SearchableSelect } from '@/components/ui/searchable-select';
-import { TimeSelectInput } from '@/components/TimeSelectInput';
-import {
-  combineDateTimeInTimeZone,
-  dateKeyInTimeZone,
-  formatTimestampInTimeZone,
-  getClientTimeZone,
-  normalizeCalendarTimeZone,
-} from '@/lib/calendarTimeUtils';
-import { formatOrgRoleLabel } from '../../../shared/teamRoleCatalog';
-import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
+  buildCustomFieldResponses,
+  customerDetailServiceFields,
+  eventBounds,
+  formStateFromEvent,
+  resolveAppointmentBookingEditStatus,
+  type CalendarEvent,
+  type CustomerOption,
+  type EventFormState,
+} from './editBookingModel';
+import { Button } from '@/components/ui/button';
+import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Spinner } from '@/components/ui/spinner';
-import { Skeleton } from '@/components/ui/skeleton';
-import { Switch } from '@/components/ui/switch';
-import { Textarea } from '@/components/ui/textarea';
 import { usePermissions } from '@/hooks/usePermissions';
 import { Permission } from '../../../shared/permissions';
+import { canEditCalendarEvent } from '@/lib/calendarEditPolicy';
+import { getClientTimeZone, normalizeCalendarTimeZone } from '@/lib/calendarTimeUtils';
 
-type CalendarParticipant = {
-  _id: string;
-  eventId: Id<'calendarEvents'>;
-  teamId: string;
-  participantType: 'teamUser' | 'customer';
-  role: 'assigned' | 'customer' | 'attendee';
-  userId?: Id<'users'>;
-  customerId?: Id<'customers'>;
-  email: string;
-  displayName?: string;
-  eventStartAt: number;
-  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
-};
-
-type CalendarEvent = {
-  _id: Id<'calendarEvents'>;
-  teamId: string;
-  title: string;
-  description?: string;
-  location?: string;
-  link?: string;
-  startAt: number;
-  endAt: number;
-  timeZone: string;
-  allDay?: boolean;
-  startDate?: string;
-  endDate?: string;
-  status: 'confirmed' | 'tentative' | 'cancelled';
-  bookingSource?: 'manual' | 'ai';
-  appointmentServiceId?: Id<'appointmentServices'>;
-  customFieldResponses?: Record<string, string | number | boolean | null>;
-  remarks?: string;
-  participants: CalendarParticipant[];
-};
-
-type CustomerOption = {
-  _id: Id<'customers'>;
-  name?: string;
-  email?: string;
-  phone?: string;
-  contactAddress: string;
-  service: string;
-};
-
-type EventFormState = {
-  title: string;
-  customerId: string;
-  assignedUserId: string;
-  attendeeUserIds: string[];
-  date: string;
-  startTime: string;
-  endTime: string;
-  allDay: boolean;
-  timeZone: string;
-  description: string;
-  link: string;
-  remarks: string;
-  collectedFields: Record<string, string>;
-};
-
-const DEFAULT_COLLECTED_FIELD_KEYS = new Set(['date', 'time', 'name', 'phone']);
-
-type ServiceFieldDefinition = {
-  key: string;
-  label: string;
-  type: string;
-  options?: string[];
-};
-
-function collectedFieldsToFormValues(
-  fields: Record<string, string | number | boolean | null | undefined>,
-): Record<string, string> {
-  const result: Record<string, string> = {};
-  for (const [key, value] of Object.entries(fields)) {
-    if (value === null || value === undefined) {
-      result[key] = '';
-    } else if (typeof value === 'boolean') {
-      result[key] = value ? 'Yes' : 'No';
-    } else {
-      result[key] = String(value);
-    }
-  }
-  return result;
-}
-
-function parseCollectedFieldFormValue(
-  raw: string,
-  field?: ServiceFieldDefinition,
-): string | number | boolean | null {
-  const trimmed = raw.trim();
-  if (!trimmed) return null;
-  if (field?.type === 'number') {
-    const parsed = Number(trimmed);
-    return Number.isFinite(parsed) ? parsed : trimmed;
-  }
-  if (field?.type === 'boolean') {
-    return trimmed.toLowerCase() === 'yes' || trimmed.toLowerCase() === 'true';
-  }
-  return trimmed;
-}
-
-function buildCustomFieldResponses(
-  formValues: Record<string, string>,
-  serviceFields: ServiceFieldDefinition[],
-): Record<string, string | number | boolean | null> {
-  const result: Record<string, string | number | boolean | null> = {};
-  const serviceFieldByKey = new Map(serviceFields.map((field) => [field.key, field]));
-
-  for (const key of ['name', 'phone']) {
-    if (key in formValues) {
-      result[key] = parseCollectedFieldFormValue(formValues[key] ?? '');
-    }
-  }
-
-  for (const field of serviceFields) {
-    if (DEFAULT_COLLECTED_FIELD_KEYS.has(field.key.toLowerCase())) continue;
-    if (!(field.key in formValues)) continue;
-    result[field.key] = parseCollectedFieldFormValue(formValues[field.key] ?? '', field);
-  }
-
-  for (const [key, value] of Object.entries(formValues)) {
-    if (key in result) continue;
-    if (DEFAULT_COLLECTED_FIELD_KEYS.has(key.toLowerCase()) && key !== 'name' && key !== 'phone') {
-      continue;
-    }
-    result[key] = parseCollectedFieldFormValue(value, serviceFieldByKey.get(key));
-  }
-
-  return result;
-}
-
-function customerDetailServiceFields(serviceFields: ServiceFieldDefinition[]) {
-  return serviceFields.filter(
-    (field) => !DEFAULT_COLLECTED_FIELD_KEYS.has(field.key.toLowerCase()),
-  );
-}
-
-function CustomerDetailFormSkeleton() {
-  return (
-    <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
-      <Skeleton className="h-3 w-24 rounded-md" />
-      {Array.from({ length: 3 }, (_, index) => (
-        <div key={index} className="grid gap-2">
-          <Skeleton className="h-4 w-24 rounded-md" />
-          <Skeleton className="h-9 w-full rounded-md" />
-        </div>
-      ))}
-    </div>
-  );
-}
-
-function memberLabel(user: Pick<Doc<'users'>, 'firstName' | 'lastName' | 'email'>) {
-  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
-  return name || user.email;
-}
-
-function customerLabel(customer: CustomerOption) {
-  return (
-    customer.name?.trim() ||
-    customer.email?.trim() ||
-    customer.phone?.trim() ||
-    customer.contactAddress
-  );
-}
-
-function dateKey(date: Date | number) {
-  return format(date, 'yyyy-MM-dd');
-}
-
-function combineDateTime(date: string, time: string, timeZone: string) {
-  return combineDateTimeInTimeZone(date, time, timeZone);
-}
-
-function getAllDayBounds(date: string, timeZone: string) {
-  const startAt = combineDateTimeInTimeZone(date, '12:00 AM', timeZone);
-  if (startAt === null) {
-    return { startAt: null, endAt: null };
-  }
-  const endAt = combineDateTimeInTimeZone(
-    dateKeyInTimeZone(startAt + 36 * 60 * 60 * 1000, timeZone),
-    '12:00 AM',
-    timeZone,
-  );
-  return { startAt, endAt };
-}
-
-function findEventCustomer(event: CalendarEvent) {
-  return event.participants.find((participant) => participant.role === 'customer');
-}
-
-function findAssignedUser(event: CalendarEvent) {
-  return event.participants.find((participant) => participant.role === 'assigned');
-}
-
-function formStateFromEvent(event: CalendarEvent, displayTimeZone: string): EventFormState {
-  const customer = findEventCustomer(event);
-  const assigned = findAssignedUser(event);
-  const timeZone = event.timeZone || displayTimeZone;
-  return {
-    title: event.title,
-    customerId: customer?.customerId ?? '',
-    assignedUserId: assigned?.userId ?? '',
-    attendeeUserIds: event.participants
-      .filter((participant) => participant.role === 'attendee' && participant.userId)
-      .map((participant) => participant.userId!),
-    date: dateKeyInTimeZone(event.startAt, timeZone),
-    startTime: formatTimestampInTimeZone(event.startAt, timeZone, {
-      hour: 'numeric',
-      minute: '2-digit',
-      hour12: true,
-    }),
-    endTime: formatTimestampInTimeZone(event.endAt, timeZone, {
-      hour: 'numeric',
-      minute: '2-digit',
-      hour12: true,
-    }),
-    allDay: event.allDay ?? false,
-    timeZone,
-    description: event.description ?? '',
-    link: event.link ?? '',
-    remarks: event.remarks ?? '',
-    collectedFields: collectedFieldsToFormValues(event.customFieldResponses ?? {}),
-  };
-}
-
-function isEventPast(event: CalendarEvent) {
-  return event.endAt < Date.now();
-}
-
-function DatePickerField({
-  value,
-  onChange,
-  disabled = false,
-}: {
-  value: string;
-  onChange: (value: string) => void;
-  disabled?: boolean;
-}) {
-  const [open, setOpen] = useState(false);
-  const selected = new Date(`${value}T00:00:00`);
-
-  return (
-    <div className="grid gap-2">
-      <Label>Date</Label>
-      <Popover open={open} onOpenChange={setOpen}>
-        <PopoverTrigger asChild>
-          <Button
-            type="button"
-            variant="outline"
-            className="h-10 w-full justify-between border-input bg-background text-left font-normal"
-            disabled={disabled}
-          >
-            {format(selected, 'MMM d, yyyy')}
-            <CalendarIcon className="size-4 text-muted-foreground" />
-          </Button>
-        </PopoverTrigger>
-        {!disabled ? (
-          <PopoverContent className="w-auto rounded-xl p-0" align="start">
-            <Calendar
-              mode="single"
-              selected={selected}
-              onSelect={(date) => {
-                if (!date) return;
-                onChange(dateKey(date));
-                setOpen(false);
-              }}
-              defaultMonth={selected}
-              className="rounded-xl border-0 bg-card p-2"
-            />
-          </PopoverContent>
-        ) : null}
-      </Popover>
-    </div>
-  );
-}
-
-type EditBookingDialogProps = {
+type Props = {
   eventId: Id<'calendarEvents'>;
   open: boolean;
   onOpenChange: (open: boolean) => void;
@@ -320,6 +32,7 @@ type EditBookingDialogProps = {
   onSuccess?: () => void;
   onDeleteSuccess?: () => void;
   autoFocusRemarks?: boolean;
+  onMarkCompleted?: () => void;
 };
 
 export function EditBookingDialog({
@@ -330,140 +43,97 @@ export function EditBookingDialog({
   onSuccess,
   onDeleteSuccess,
   autoFocusRemarks,
-}: EditBookingDialogProps) {
+  onMarkCompleted,
+}: Props) {
   const { can } = usePermissions();
   const canManageCalendar = can(Permission.CALENDAR_MANAGE);
-
   const currentUser = useQuery(api.users.currentUser);
   const activeTeam = useQuery(api.teams.getActiveTeam);
   const teamUsers = useQuery(api.users.getUsers, {});
   const customerOptions = useQuery(api.calendarEvents.listCustomerOptions, {});
-
+  const eventData = useQuery(api.calendarEvents.getEventForEditing, open ? { eventId } : 'skip') as CalendarEvent | null | undefined;
+  const appointmentDetails = useQuery(api.calendarEvents.getAppointmentDetails, open ? { eventId } : 'skip');
+  const appointmentStatusResult = useQuery(
+    api.appointmentBooking.editBookingStatus.getEditBookingStatus,
+    open ? { bookingId: eventId } : 'skip',
+  );
   const updateEvent = useMutation(api.calendarEvents.update);
   const removeEvent = useMutation(api.calendarEvents.remove);
-
-  const eventData = useQuery(
-    api.calendarEvents.getEventForEditing,
-    open && eventId ? { eventId } : 'skip',
-  ) as CalendarEvent | null | undefined;
-
-  const editingAppointmentDetails = useQuery(
-    api.calendarEvents.getAppointmentDetails,
-    open && eventId ? { eventId } : 'skip',
+  const updateBookingStatus = useMutation(api.appointmentBooking.statusTransition.updateBookingStatus);
+  const displayTimeZone = useMemo(
+    () => activeTeam?.timeZone ? normalizeCalendarTimeZone(activeTeam.timeZone) : getClientTimeZone(),
+    [activeTeam?.timeZone],
   );
-
-  const displayTimeZone = useMemo(() => {
-    return activeTeam?.timeZone ? normalizeCalendarTimeZone(activeTeam.timeZone) : getClientTimeZone();
-  }, [activeTeam?.timeZone]);
-
   const [formState, setFormState] = useState<EventFormState | null>(null);
   const [isSaving, setIsSaving] = useState(false);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);
+  const isAppointment = Boolean(appointmentDetails?.isAppointmentBooking ?? eventData?.appointmentServiceId ?? eventData?.bookingSource === 'ai');
+  const appointmentLoading = open && appointmentDetails === undefined;
+  const appointmentStatus = resolveAppointmentBookingEditStatus(appointmentStatusResult);
 
   useEffect(() => {
-    if (eventData && !formState) {
-      setFormState(formStateFromEvent(eventData, displayTimeZone));
+    if (eventData && !formState && (!isAppointment || appointmentStatus.kind === 'editable')) {
+      setFormState(formStateFromEvent(eventData, displayTimeZone, isAppointment && appointmentStatus.kind === 'editable' ? appointmentStatus.status : undefined));
     }
-  }, [eventData, displayTimeZone]);
-
-  const isEditingAppointmentBooking = Boolean(
-    editingAppointmentDetails?.isAppointmentBooking ??
-      eventData?.appointmentServiceId ??
-      eventData?.bookingSource === 'ai',
-  );
-
-  const isLoadingEditingAppointmentDetails =
-    open && eventId !== null && editingAppointmentDetails === undefined;
-
-  const customerServiceFields = customerDetailServiceFields(
-    editingAppointmentDetails?.serviceFields ?? [],
-  );
+  }, [appointmentStatus, displayTimeZone, eventData, formState, isAppointment]);
 
-  const isEditingPastEvent = eventData ? isEventPast(eventData) : false;
-  const canEditEvent = canManageCalendar && !isEditingPastEvent;
-
-  const updateForm = (patch: Partial<EventFormState>) => {
-    setFormState((current) => (current ? { ...current, ...patch } : null));
-  };
-
-  const updateCollectedField = (key: string, value: string) => {
-    setFormState((current) => {
-      if (!current) return null;
-      return {
-        ...current,
-        collectedFields: {
-          ...current.collectedFields,
-          [key]: value,
-        },
-      };
-    });
-  };
+  useEffect(() => {
+    if (!open) setFormState(null);
+  }, [open]);
+
+  const canEditEvent = eventData ? canEditCalendarEvent({ canManageCalendar, endAt: eventData.endAt }) : canManageCalendar;
+  const statusLoading = isAppointment && appointmentStatus.kind === 'loading';
+  const statusError = isAppointment && appointmentStatus.kind === 'missing'
+    ? 'Booking status is unavailable. This appointment has no booking session.'
+    : isAppointment && appointmentStatus.kind === 'unsupported'
+      ? 'Booking status cannot be edited right now. Finish the active booking flow and try again.'
+      : null;
+  const loading = open && (eventData === undefined || statusLoading || (!statusError && formState === null));
+  const updateForm = (patch: Partial<EventFormState>) => setFormState((current) => current ? { ...current, ...patch } : null);
+  const updateCollectedField = (key: string, value: string) => setFormState((current) => current ? {
+    ...current,
+    collectedFields: { ...current.collectedFields, [key]: value },
+  } : null);
 
   const handleSaveEvent = async (event: React.FormEvent) => {
     event.preventDefault();
     if (!formState || !canEditEvent) return;
-    if (!formState.title.trim()) {
-      toast.error('Event title is required');
-      return;
-    }
-    if (!formState.customerId || !formState.assignedUserId) {
-      toast.error('Select a customer and assigned team member');
-      return;
-    }
-    const eventTimeZone = formState.timeZone || displayTimeZone;
-    const timeRange = formState.allDay
-      ? getAllDayBounds(formState.date, eventTimeZone)
-      : {
-          startAt: combineDateTime(formState.date, formState.startTime, eventTimeZone),
-          endAt: combineDateTime(formState.date, formState.endTime, eventTimeZone),
-        };
-    const { startAt, endAt } = timeRange;
-    if (startAt === null || endAt === null) {
-      toast.error('Enter a valid start and end time');
-      return;
-    }
-    if (endAt <= startAt) {
-      toast.error('End time must be after start time');
-      return;
-    }
-
+    if (!formState.title.trim()) return void toast.error('Event title is required');
+    if (!formState.customerId || !formState.assignedUserId) return void toast.error('Select a customer and assigned team member');
+    const timeZone = formState.timeZone || displayTimeZone;
+    const { startAt, endAt } = eventBounds(formState, timeZone);
+    if (startAt === null || endAt === null) return void toast.error('Enter a valid start and end time');
+    if (endAt <= startAt) return void toast.error('End time must be after start time');
     setIsSaving(true);
     try {
-      const payload = {
+      await updateEvent({
+        eventId,
         title: formState.title,
         description: formState.description || undefined,
         link: formState.link || undefined,
         startAt,
         endAt,
-        timeZone: eventTimeZone,
+        timeZone,
         allDay: formState.allDay,
         startDate: formState.allDay ? formState.date : undefined,
         endDate: formState.allDay ? formState.date : undefined,
         customerId: formState.customerId as Id<'customers'>,
         assignedUserId: formState.assignedUserId as Id<'users'>,
         attendeeUserIds: formState.attendeeUserIds as Id<'users'>[],
-      };
-
-      await updateEvent({
-        eventId,
-        ...payload,
-        ...(isEditingAppointmentBooking
-          ? {
-              customFieldResponses: buildCustomFieldResponses(
-                formState.collectedFields,
-                editingAppointmentDetails?.serviceFields ?? [],
-              ),
-              remarks: formState.remarks.trim(),
-            }
-          : {}),
+        ...(isAppointment ? {
+          customFieldResponses: buildCustomFieldResponses(formState.collectedFields, appointmentDetails?.serviceFields ?? []),
+          remarks: formState.remarks.trim(),
+        } : {}),
       });
-
+      if (isAppointment && formState.status && appointmentStatus.kind === 'editable' && formState.status !== appointmentStatus.status) {
+        await updateBookingStatus({ bookingId: eventId, status: formState.status });
+      }
       toast.success('Event updated');
       onSuccess?.();
       onOpenChange(false);
-    } catch (err) {
-      toast.error(err instanceof Error ? err.message : 'Could not save event');
+    } catch (error) {
+      toast.error(error instanceof Error ? error.message : 'Could not save event');
     } finally {
       setIsSaving(false);
     }
@@ -477,415 +147,54 @@ export function EditBookingDialog({
       setDeleteDialogOpen(false);
       onDeleteSuccess?.();
       onOpenChange(false);
-    } catch (err) {
-      toast.error(err instanceof Error ? err.message : 'Could not delete event');
+    } catch (error) {
+      toast.error(error instanceof Error ? error.message : 'Could not delete event');
     } finally {
       setIsDeleting(false);
     }
   };
 
-  const teamUserRows =
-    teamUsers && teamUsers.length > 0
-      ? teamUsers
-      : currentUser
-        ? [currentUser]
-        : [];
-
-  const loading = open && (eventData === undefined || formState === null);
-
+  const teamUserRows = teamUsers?.length ? teamUsers : currentUser ? [currentUser] : [];
   return (
     <>
       <Dialog open={open} onOpenChange={onOpenChange}>
-        <DialogContent className="w-full p-0 sm:max-w-3xl gap-0 overflow-hidden flex flex-col max-h-[90vh]">
-          <DialogHeader className="border-b border-border px-6 py-6 shrink-0">
-            <DialogTitle className="truncate">
-              Edit Booking
-            </DialogTitle>
-            <DialogDescription className="sr-only">
-              Edit calendar event booking details
-            </DialogDescription>
+        <DialogContent showCloseButton={!onMarkCompleted} className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
+          <DialogHeader className="shrink-0 border-b border-border px-6 py-6">
+            <div className="flex items-start justify-between gap-3">
+              <div className="min-w-0"><DialogTitle className="truncate">Edit Booking</DialogTitle><DialogDescription className="sr-only">Edit calendar event booking details</DialogDescription></div>
+              {onMarkCompleted ? <Button type="button" size="sm" className="shrink-0" onClick={onMarkCompleted}>Mark as completed</Button> : null}
+            </div>
           </DialogHeader>
-
-          <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-6 py-5">
-            {loading ? (
-              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
-                {/* Left Column Skeleton */}
-                <div className="flex flex-col gap-6">
-                  <div className="space-y-4">
-                    <Skeleton className="h-4 w-24 rounded-md" />
-                    <div className="grid gap-2">
-                      <Skeleton className="h-3 w-12 rounded-md" />
-                      <Skeleton className="h-10 w-full rounded-md" />
-                    </div>
-                    <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
-                      <div className="grid gap-2">
-                        <Skeleton className="h-3 w-12 rounded-md" />
-                        <Skeleton className="h-10 w-full rounded-md" />
-                      </div>
-                      <div className="flex justify-between items-center h-10 bg-muted/20 px-3 rounded-lg">
-                        <Skeleton className="h-3 w-16 rounded-md" />
-                        <Skeleton className="h-6 w-10 rounded-full" />
-                      </div>
-                      <div className="grid grid-cols-2 gap-4">
-                        <Skeleton className="h-10 w-full rounded-md" />
-                        <Skeleton className="h-10 w-full rounded-md" />
-                      </div>
-                    </div>
-                  </div>
-
-                  <div className="space-y-4">
-                    <Skeleton className="h-4 w-32 rounded-md" />
-                    <div className="grid gap-2">
-                      <Skeleton className="h-3 w-24 rounded-md" />
-                      <Skeleton className="h-10 w-full rounded-md" />
-                    </div>
-                    <div className="grid gap-2">
-                      <Skeleton className="h-3 w-12 rounded-md" />
-                      <Skeleton className="h-10 w-full rounded-md" />
-                    </div>
-                    <div className="grid gap-2">
-                      <Skeleton className="h-3 w-20 rounded-md" />
-                      <Skeleton className="h-32 w-full rounded-md" />
-                    </div>
-                  </div>
-                </div>
-
-                {/* Right Column Skeleton */}
-                <div className="flex flex-col gap-6">
-                  <div className="space-y-4">
-                    <Skeleton className="h-4 w-32 rounded-md" />
-                    <div className="grid gap-2">
-                      <Skeleton className="h-3.5 w-16 rounded-md" />
-                      <Skeleton className="h-10 w-full rounded-md" />
-                    </div>
-                  </div>
-
-                  <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
-                    <Skeleton className="h-4 w-28 rounded-md" />
-                    <div className="grid gap-2">
-                      <Skeleton className="h-3 w-24 rounded-md" />
-                      <Skeleton className="h-10 w-full rounded-md" />
-                    </div>
-                    <div className="grid gap-2">
-                      <Skeleton className="h-3 w-12 rounded-md" />
-                      <Skeleton className="h-10 w-full rounded-md" />
-                    </div>
-                  </div>
-
-                  <div className="space-y-4">
-                    <Skeleton className="h-4 w-24 rounded-md" />
-                    <div className="grid gap-2">
-                      <Skeleton className="h-3.5 w-16 rounded-md" />
-                      <Skeleton className="h-24 w-full rounded-md" />
-                    </div>
-                  </div>
-                </div>
-              </div>
+          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
+            {loading ? <EditBookingFormSkeleton /> : statusError ? (
+              <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{statusError}</div>
             ) : formState ? (
-              <form id="edit-booking-form" onSubmit={handleSaveEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
-                {/* Left Column (Booking Details) */}
-                <div className="flex flex-col gap-6">
-                  <div className="space-y-4">
-                    <p className="text-xs font-semibold text-muted-foreground">Event Schedule</p>
-                    
-                    <div className="grid gap-2">
-                      <Label htmlFor="dialog-event-title">Title</Label>
-                      <Input
-                        id="dialog-event-title"
-                        value={formState.title}
-                        onChange={(event) => updateForm({ title: event.target.value })}
-                        placeholder="Event title"
-                        disabled={!canEditEvent}
-                      />
-                    </div>
-
-                    <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
-                      <DatePickerField
-                        value={formState.date}
-                        onChange={(value) => updateForm({ date: value })}
-                        disabled={!canEditEvent}
-                      />
-
-                      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
-                        <Label htmlFor="dialog-event-all-day" className="text-sm">
-                          All day
-                        </Label>
-                        <Switch
-                          id="dialog-event-all-day"
-                          checked={formState.allDay}
-                          onCheckedChange={(checked) => updateForm({ allDay: checked })}
-                          disabled={!canEditEvent}
-                        />
-                      </div>
-
-                      {!formState.allDay && (
-                        <div className="grid grid-cols-2 gap-4">
-                          <TimeSelectInput
-                            label="From"
-                            value={formState.startTime}
-                            onChange={(value) => updateForm({ startTime: value })}
-                            disabled={!canEditEvent}
-                          />
-                          <TimeSelectInput
-                            label="To"
-                            value={formState.endTime}
-                            onChange={(value) => updateForm({ endTime: value })}
-                            disabled={!canEditEvent}
-                          />
-                        </div>
-                      )}
-                    </div>
-                  </div>
-
-                  <div className="space-y-4">
-                    <p className="text-xs font-semibold text-muted-foreground">Assignment & Details</p>
-
-                    <div className="grid gap-2">
-                      <Label>Team member</Label>
-                      <SearchableSelect
-                        value={formState.assignedUserId || undefined}
-                        placeholder="Select team member"
-                        searchPlaceholder="Search team members..."
-                        emptyText="No team members found."
-                        options={teamUserRows.map((user) => {
-                          const role = 'role' in user ? formatOrgRoleLabel(user.role) : 'Member';
-                          return {
-                            value: user._id,
-                            label: memberLabel(user),
-                            tag: role,
-                            searchValue: `${memberLabel(user)} ${user.email} ${role}`,
-                          };
-                        })}
-                        onChange={(value) => updateForm({ assignedUserId: value })}
-                        disabled={!canEditEvent}
-                      />
-                    </div>
-
-                    <div className="grid gap-2">
-                      <Label htmlFor="dialog-event-link">Link</Label>
-                      <Input
-                        id="dialog-event-link"
-                        type="url"
-                        value={formState.link}
-                        onChange={(event) => updateForm({ link: event.target.value })}
-                        placeholder="https://meet.google.com/..."
-                        disabled={!canEditEvent}
-                      />
-                    </div>
-
-                    <div className="grid gap-2">
-                      <Label htmlFor="dialog-event-description">Description</Label>
-                      <Textarea
-                        id="dialog-event-description"
-                        value={formState.description}
-                        onChange={(event) => updateForm({ description: event.target.value })}
-                        placeholder="Optional notes"
-                        className="min-h-32"
-                        disabled={!canEditEvent}
-                      />
-                    </div>
-                  </div>
-                </div>
-
-                {/* Right Column (Customer Details & Remarks) */}
-                <div className="flex flex-col gap-6">
-                  <div className="space-y-4">
-                    <p className="text-xs font-semibold text-muted-foreground">Customer Selection</p>
-
-                    <div className="grid gap-2">
-                      <Label>Customer</Label>
-                      <SearchableSelect
-                        value={formState.customerId || undefined}
-                        placeholder="Select customer"
-                        searchPlaceholder="Search customers..."
-                        emptyText="No customers found."
-                        options={(customerOptions ?? []).map((customer: CustomerOption) => ({
-                          value: customer._id,
-                          label: customerLabel(customer),
-                          searchValue: `${customerLabel(customer)} ${customer.email ?? ''} ${customer.phone ?? ''}`,
-                        }))}
-                        onChange={(value) => updateForm({ customerId: value })}
-                        disabled={!canEditEvent}
-                      />
-                    </div>
-                  </div>
-
-                  {isEditingAppointmentBooking ? (
-                    isLoadingEditingAppointmentDetails ? (
-                      <CustomerDetailFormSkeleton />
-                    ) : (
-                      <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
-                        <p className="text-xs font-semibold text-muted-foreground">Customer detail</p>
-
-                        <div className="grid gap-2">
-                          <Label htmlFor="dialog-booking-customer-name">Customer name</Label>
-                          <Input
-                            id="dialog-booking-customer-name"
-                            value={formState.collectedFields.name ?? ''}
-                            onChange={(event) => updateCollectedField('name', event.target.value)}
-                            placeholder="Customer name"
-                            disabled={!canEditEvent}
-                          />
-                        </div>
-
-                        <div className="grid gap-2">
-                          <Label htmlFor="dialog-booking-customer-phone">Phone</Label>
-                          <Input
-                            id="dialog-booking-customer-phone"
-                            value={formState.collectedFields.phone ?? ''}
-                            onChange={(event) => updateCollectedField('phone', event.target.value)}
-                            placeholder="Phone number"
-                            disabled={!canEditEvent}
-                          />
-                        </div>
-
-                        {customerServiceFields.map((field) => {
-                          const fieldId = `dialog-booking-field-${field.key}`;
-                          const value = formState.collectedFields[field.key] ?? '';
-
-                          if (field.type === 'boolean') {
-                            return (
-                              <div
-                                key={field.key}
-                                className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5"
-                              >
-                                <Label htmlFor={fieldId} className="text-sm">
-                                  {field.label}
-                                </Label>
-                                <Switch
-                                  id={fieldId}
-                                  checked={value.toLowerCase() === 'yes' || value.toLowerCase() === 'true'}
-                                  onCheckedChange={(checked) =>
-                                    updateCollectedField(field.key, checked ? 'Yes' : 'No')
-                                  }
-                                  disabled={!canEditEvent}
-                                />
-                              </div>
-                            );
-                          }
-
-                          if (field.type === 'select' && field.options && field.options.length > 0) {
-                            return (
-                              <div key={field.key} className="grid gap-2">
-                                <Label>{field.label}</Label>
-                                <SearchableSelect
-                                  value={value || undefined}
-                                  placeholder={`Select ${field.label.toLowerCase()}`}
-                                  searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
-                                  emptyText="No options found."
-                                  options={field.options.map((option) => ({
-                                    value: option,
-                                    label: option,
-                                    searchValue: option,
-                                  }))}
-                                  onChange={(nextValue) => updateCollectedField(field.key, nextValue)}
-                                  disabled={!canEditEvent}
-                                />
-                              </div>
-                            );
-                          }
-
-                          return (
-                            <div key={field.key} className="grid gap-2">
-                              <Label htmlFor={fieldId}>{field.label}</Label>
-                              <Input
-                                id={fieldId}
-                                type={field.type === 'number' ? 'number' : 'text'}
-                                value={value}
-                                onChange={(event) =>
-                                  updateCollectedField(field.key, event.target.value)
-                                }
-                                placeholder={field.label}
-                                disabled={!canEditEvent}
-                              />
-                            </div>
-                          );
-                        })}
-                      </div>
-                    )
-                  ) : null}
-
-                  {isEditingAppointmentBooking && !isLoadingEditingAppointmentDetails ? (
-                    <div className="space-y-4">
-                      <p className="text-xs font-semibold text-muted-foreground">Internal Notes</p>
-                      
-                      <div className="grid gap-2">
-                        <Label htmlFor="dialog-event-remarks">Remarks</Label>
-                        <Textarea
-                          id="dialog-event-remarks"
-                          value={formState.remarks}
-                          onChange={(event) => updateForm({ remarks: event.target.value })}
-                          placeholder="Add internal notes for this booking"
-                          className="min-h-24"
-                          disabled={!canEditEvent}
-                          autoFocus={autoFocusRemarks}
-                        />
-                      </div>
-                    </div>
-                  ) : null}
-                </div>
-              </form>
-            ) : (
-              <p className="text-sm text-muted-foreground">Event not found.</p>
-            )}
+              <EditBookingForm
+                state={formState}
+                update={updateForm}
+                updateCollectedField={updateCollectedField}
+                onSubmit={handleSaveEvent}
+                teamUsers={teamUserRows}
+                customers={(customerOptions ?? []) as CustomerOption[]}
+                serviceFields={customerDetailServiceFields(appointmentDetails?.serviceFields ?? [])}
+                appointment={isAppointment}
+                appointmentLoading={appointmentLoading}
+                disabled={!canEditEvent}
+                autoFocusRemarks={autoFocusRemarks}
+              />
+            ) : <p className="text-sm text-muted-foreground">Event not found.</p>}
           </div>
-
-          <DialogFooter className="border-t border-border px-6 py-4 shrink-0 flex-row items-center justify-end gap-1.5">
-            {canEditEvent && formState && (
-              <Button
-                type="button"
-                variant="ghost"
-                size="icon"
-                className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
-                onClick={() => setDeleteDialogOpen(true)}
-                aria-label="Delete event"
-              >
-                <Trash2 className="size-4" />
-              </Button>
-            )}
-            <Button
-              type="button"
-              variant="ghost"
-              onClick={() => onOpenChange(false)}
-            >
-              {(!canEditEvent || loading) ? 'Close' : 'Cancel'}
-            </Button>
-            {canEditEvent && formState && (
-              <Button type="submit" form="edit-booking-form" className="w-auto" disabled={isSaving}>
-                {isSaving ? <Spinner className="mr-2 size-4" /> : null}
-                Save Changes
-              </Button>
-            )}
+          <DialogFooter className="shrink-0 flex-row items-center justify-end gap-1.5 border-t border-border px-6 py-4">
+            {canEditEvent && formState ? <Button type="button" variant="ghost" size="icon" className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteDialogOpen(true)} aria-label="Delete event"><Trash2 className="size-4" /></Button> : null}
+            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{!canEditEvent || loading ? 'Close' : 'Cancel'}</Button>
+            {canEditEvent && formState ? <Button type="submit" form="edit-booking-form" disabled={isSaving}>{isSaving ? <Spinner className="mr-2 size-4" /> : null}Save Changes</Button> : null}
           </DialogFooter>
         </DialogContent>
       </Dialog>
-
       <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
         <DialogContent>
-          <DialogHeader>
-            <DialogTitle>Delete event?</DialogTitle>
-            <DialogDescription>
-              This removes the appointment from the shared team calendar.
-            </DialogDescription>
-          </DialogHeader>
-          <DialogFooter>
-            <Button
-              type="button"
-              variant="outline"
-              onClick={() => setDeleteDialogOpen(false)}
-            >
-              Cancel
-            </Button>
-            <Button
-              type="button"
-              variant="destructive"
-              onClick={handleDeleteEvent}
-              disabled={isDeleting}
-            >
-              {isDeleting ? <Spinner className="mr-2 size-4" /> : null}
-              Delete
-            </Button>
-          </DialogFooter>
+          <DialogHeader><DialogTitle>Delete event?</DialogTitle><DialogDescription>This removes the appointment from the shared team calendar.</DialogDescription></DialogHeader>
+          <DialogFooter><Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button><Button type="button" variant="destructive" onClick={handleDeleteEvent} disabled={isDeleting}>{isDeleting ? <Spinner className="mr-2 size-4" /> : null}Delete</Button></DialogFooter>
         </DialogContent>
       </Dialog>
     </>

```

## convex/appointmentBooking/editBookingStatus.ts

```
import { v } from "convex/values";
import { Permission } from "../../shared/permissions";
import { getAuthContext } from "../authUtils";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { query } from "../_generated/server";
import { permissionsForCurrentUser } from "./access";

export const getEditBookingStatus = query({
  args: { bookingId: v.id("calendarEvents") },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const permissions = await permissionsForCurrentUser(ctx);
    if (!permissions.includes(Permission.CALENDAR_READ)) {
      throw new Error("Forbidden");
    }
    const event = await ctx.db.get(args.bookingId);
    if (event === null || event.teamId !== auth.activeTeamId) {
      return { kind: "missing_event" as const };
    }
    const session = await ctx.db
      .query("appointmentBookingSessions")
      .withIndex("by_calendarEventId", (q) => q.eq("calendarEventId", event._id))
      .unique();
    if (session === null) {
      return { kind: "missing_session" as const };
    }
    const { status } = session;
    if (
      status === AppointmentBookingSessionStatus.Booked ||
      status === AppointmentBookingSessionStatus.Completed ||
      status === AppointmentBookingSessionStatus.Cancelled ||
      status === AppointmentBookingSessionStatus.NoShow
    ) {
      return { kind: "editable" as const, status };
    }
    return { kind: "unsupported_status" as const, status };
  },
});

```

## src/components/calendar/EditBookingAppointmentState.test.ts

```
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { resolveAppointmentBookingEditStatus } from './editBookingModel';

const dialogSource = readFileSync(new URL('./EditBookingDialog.tsx', import.meta.url), 'utf8');
const modelSource = readFileSync(new URL('./editBookingModel.ts', import.meta.url), 'utf8');
const statusQuerySource = readFileSync(
  new URL('../../../convex/appointmentBooking/editBookingStatus.ts', import.meta.url),
  'utf8',
);

test('appointment editor rejects missing and unsupported booking sessions visibly', () => {
  expect(modelSource).toContain('resolveAppointmentBookingEditStatus');
  expect(modelSource).toContain("status === 'booked'");
  expect(modelSource).toContain("status === 'completed'");
  expect(modelSource).toContain("status === 'cancelled'");
  expect(modelSource).toContain("status === 'no_show'");
  expect(dialogSource).toContain('Booking status is unavailable');
  expect(dialogSource).toContain('Booking status cannot be edited right now');
});

test('appointment editor reads status from a focused Convex module', () => {
  expect(dialogSource).toContain('api.appointmentBooking.editBookingStatus.getEditBookingStatus');
  expect(statusQuerySource).toContain('export const getEditBookingStatus = query');
  expect(statusQuerySource).toContain('.withIndex("by_calendarEventId"');
});

test('missing booking sessions resolve to a visible error state', () => {
  expect(resolveAppointmentBookingEditStatus({ kind: 'missing_session' })).toEqual({ kind: 'missing' });
});

test.each(['collecting', 'confirming', 'editing'])('%s booking sessions cannot initialize the status Select', (status) => {
  expect(resolveAppointmentBookingEditStatus({ kind: 'unsupported_status', status })).toEqual({ kind: 'unsupported' });
});

test.each(['booked', 'completed', 'cancelled', 'no_show'])('%s booking sessions initialize the status Select', (status) => {
  expect(resolveAppointmentBookingEditStatus({ kind: 'editable', status })).toEqual({ kind: 'editable', status });
});

```

