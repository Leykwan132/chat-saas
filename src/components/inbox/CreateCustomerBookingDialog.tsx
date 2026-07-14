import { useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ManualBookingScheduleField,
  type ManualBookingScheduleFeedback,
} from './ManualBookingScheduleField';
import {
  buildManualBookingCollectedFields,
  defaultManualBookingEndTime,
  getManualBookingSelection,
  manualBookingCustomerFields,
  type ManualBookingCollectedFields,
} from './manualBookingScheduleModel';

type AvailabilityStatus =
  | { kind: 'idle' }
  | { kind: 'checking'; key: string }
  | { kind: 'available'; key: string }
  | { kind: 'conflict'; key: string; message: string };

export function CreateCustomerBookingDialog({
  open,
  onOpenChange,
  conversationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: Id<'conversations'>;
}) {
  const { agentId } = useParams();
  const options = useQuery(
    api.appointmentBooking.manualBooking.getCreateOptions,
    open ? { conversationId } : 'skip',
  );
  const checkAvailability = useMutation(api.appointmentBooking.manualBooking.checkAvailability);
  const createBooking = useMutation(api.appointmentBooking.manualBooking.create);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [fields, setFields] = useState<ManualBookingCollectedFields>({});
  const [availability, setAvailability] = useState<AvailabilityStatus>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const availabilityRequestRef = useRef(0);
  const endTimeCustomizedRef = useRef(false);
  const comboboxPortalContainerRef = useRef<HTMLDivElement>(null);
  const effectiveServiceId = serviceId || options?.services[0]?.serviceId || '';
  const effectiveFields = Object.keys(fields).length > 0
    ? fields
    : {
        name: options?.customer.name ?? '',
        email: options?.customer.email ?? '',
        phone: options?.customer.phone ?? '',
      };
  const service = options?.services.find((item) => item.serviceId === effectiveServiceId);
  const selection = service
    ? getManualBookingSelection(effectiveServiceId, date, startTime, endTime, service.timeZone)
    : { kind: 'incomplete' as const };
  const selectionAvailable = selection.kind === 'ready'
    && availability.kind === 'available'
    && availability.key === selection.key;
  const scheduleFeedback: ManualBookingScheduleFeedback = selection.kind === 'invalid'
    ? { kind: 'invalid', message: selection.message }
    : selection.kind === 'ready'
        && availability.kind !== 'idle'
        && availability.key === selection.key
      ? availability.kind === 'checking'
        ? { kind: 'checking' }
        : availability.kind === 'available'
          ? { kind: 'available' }
          : availability.kind === 'conflict'
            ? { kind: 'conflict', message: availability.message }
            : { kind: 'idle' }
      : { kind: 'idle' };

  const updateField = (key: string, value: string | number | boolean) => {
    setFields((current) => ({
      ...(Object.keys(current).length > 0 ? current : effectiveFields),
      [key]: value,
    }));
  };

  const runAvailabilityCheck = async (
    nextServiceId: string,
    nextDate: string,
    nextStartTime: string,
    nextEndTime: string,
  ) => {
    const requestId = ++availabilityRequestRef.current;
    const nextService = options?.services.find((item) => item.serviceId === nextServiceId);
    const nextSelection = nextService
      ? getManualBookingSelection(
          nextServiceId,
          nextDate,
          nextStartTime,
          nextEndTime,
          nextService.timeZone,
        )
      : { kind: 'incomplete' as const };
    if (nextSelection.kind !== 'ready') {
      setAvailability({ kind: 'idle' });
      return;
    }
    setAvailability({ kind: 'checking', key: nextSelection.key });
    try {
      const result = await checkAvailability({
        conversationId,
        serviceId: nextServiceId as Id<'appointmentServices'>,
        startAt: nextSelection.startAt,
        endAt: nextSelection.endAt,
      });
      if (availabilityRequestRef.current !== requestId) return;
      setAvailability(result.available
        ? { kind: 'available', key: nextSelection.key }
        : { kind: 'conflict', key: nextSelection.key, message: result.message });
    } catch (error) {
      if (availabilityRequestRef.current !== requestId) return;
      if (!(error instanceof Error)) throw error;
      setAvailability({ kind: 'conflict', key: nextSelection.key, message: error.message });
    }
  };

  const handleCreate = async () => {
    if (!effectiveServiceId || selection.kind !== 'ready' || !selectionAvailable) return;
    setBusy(true);
    try {
      await createBooking({
        conversationId,
        serviceId: effectiveServiceId as Id<'appointmentServices'>,
        collectedFields: buildManualBookingCollectedFields(effectiveFields, date, startTime),
        startAt: selection.startAt,
        endAt: selection.endAt,
      });
      toast.success('Booking created');
      onOpenChange(false);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setAvailability({ kind: 'conflict', key: selection.key, message: error.message });
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!agentId) throw new Error('Missing agent ID');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
        overlayClassName="bg-black/10 supports-backdrop-filter:backdrop-blur-none"
      >
        <div ref={comboboxPortalContainerRef} className="pointer-events-none absolute inset-0" />
        <DialogHeader><DialogTitle>Create booking</DialogTitle></DialogHeader>
        {options === undefined ? (
          <div className="h-32 rounded-md bg-muted motion-safe:animate-pulse" />
        ) : options.services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active Services are configured.</p>
        ) : (
          <div className="grid gap-5">
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Service</Label>
                <Button asChild variant="linkAccent" size="sm" className="h-auto p-0">
                  <Link to={`/dashboard/${agentId}/services/new`}>
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Create new service
                  </Link>
                </Button>
              </div>
              <Select value={effectiveServiceId} onValueChange={(value) => {
                const nextService = options.services.find((item) => item.serviceId === value);
                const nextEndTime = nextService
                  ? defaultManualBookingEndTime(startTime, nextService.durationMinutes)
                  : '';
                setServiceId(value);
                setEndTime(nextEndTime);
                endTimeCustomizedRef.current = false;
                void runAvailabilityCheck(value, date, startTime, nextEndTime);
              }}>
                <SelectTrigger className="h-10 w-full px-3 text-sm">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent className="text-sm">
                  {options.services.map((item) => (
                    <SelectItem
                      key={item.serviceId}
                      value={item.serviceId}
                      className="py-2.5 text-sm"
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ManualBookingScheduleField
              date={date}
              startTime={startTime}
              endTime={endTime}
              feedback={scheduleFeedback}
              portalContainer={comboboxPortalContainerRef}
              onDateChange={(value) => {
                setDate(value);
                void runAvailabilityCheck(effectiveServiceId, value, startTime, endTime);
              }}
              onStartTimeChange={(value) => {
                const nextEndTime = !endTimeCustomizedRef.current && service
                  ? defaultManualBookingEndTime(value, service.durationMinutes)
                  : endTime;
                setStartTime(value);
                setEndTime(nextEndTime);
                void runAvailabilityCheck(effectiveServiceId, date, value, nextEndTime);
              }}
              onEndTimeChange={(value) => {
                endTimeCustomizedRef.current = true;
                setEndTime(value);
                void runAvailabilityCheck(effectiveServiceId, date, startTime, value);
              }}
            />
            {manualBookingCustomerFields(service?.fields ?? []).map((field) => (
              <div key={field.key} className="grid gap-2">
                <Label>{field.label}</Label>
                {field.type === 'select' ? (
                  <Select value={String(effectiveFields[field.key] ?? '')} onValueChange={(value) => updateField(field.key, value)}>
                    <SelectTrigger className="h-10 w-full"><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>{field.options?.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                ) : field.type === 'boolean' ? (
                  <Button type="button" variant="outline" onClick={() => updateField(field.key, effectiveFields[field.key] !== true)}>{effectiveFields[field.key] === true ? 'Yes' : 'No'}</Button>
                ) : (
                  <Input type={field.type === 'number' ? 'number' : field.type === 'phone' ? 'tel' : field.type} value={String(effectiveFields[field.key] ?? '')} onChange={(event) => updateField(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)} />
                )}
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={busy || !selectionAvailable} onClick={() => void handleCreate()}>Create booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
