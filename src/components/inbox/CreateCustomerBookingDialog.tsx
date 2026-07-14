import { useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDatePickerField } from '@/components/calendar/CalendarDatePickerField';
import { TimeSelectInput } from '@/components/TimeSelectInput';
import {
  buildManualBookingCollectedFields,
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
  const options = useQuery(
    api.appointmentBooking.manualBooking.getCreateOptions,
    open ? { conversationId } : 'skip',
  );
  const checkAvailability = useMutation(api.appointmentBooking.manualBooking.checkAvailability);
  const createBooking = useMutation(api.appointmentBooking.manualBooking.create);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('');
  const [fields, setFields] = useState<ManualBookingCollectedFields>({});
  const [availability, setAvailability] = useState<AvailabilityStatus>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const availabilityRequestRef = useRef(0);
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
    ? getManualBookingSelection(effectiveServiceId, date, time, service.timeZone)
    : null;
  const selectionAvailable = selection !== null
    && availability.kind === 'available'
    && availability.key === selection.key;

  const updateField = (key: string, value: string | number | boolean) => {
    setFields((current) => ({
      ...(Object.keys(current).length > 0 ? current : effectiveFields),
      [key]: value,
    }));
  };

  const runAvailabilityCheck = async (
    nextServiceId: string,
    nextDate: string,
    nextTime: string,
  ) => {
    const requestId = ++availabilityRequestRef.current;
    const nextService = options?.services.find((item) => item.serviceId === nextServiceId);
    const nextSelection = nextService
      ? getManualBookingSelection(nextServiceId, nextDate, nextTime, nextService.timeZone)
      : null;
    if (nextSelection === null) {
      setAvailability({ kind: 'idle' });
      return;
    }
    setAvailability({ kind: 'checking', key: nextSelection.key });
    try {
      const result = await checkAvailability({
        conversationId,
        serviceId: nextServiceId as Id<'appointmentServices'>,
        startAt: nextSelection.startAt,
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
    if (!effectiveServiceId || selection === null || !selectionAvailable) return;
    setBusy(true);
    try {
      await createBooking({
        conversationId,
        serviceId: effectiveServiceId as Id<'appointmentServices'>,
        collectedFields: buildManualBookingCollectedFields(effectiveFields, date, time),
        startAt: selection.startAt,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Create booking</DialogTitle></DialogHeader>
        {options === undefined ? (
          <div className="h-32 rounded-md bg-muted motion-safe:animate-pulse" />
        ) : options.services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active Services are configured.</p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Service</Label>
              <Select value={effectiveServiceId} onValueChange={(value) => {
                setServiceId(value);
                void runAvailabilityCheck(value, date, time);
              }}>
                <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select a service" /></SelectTrigger>
                <SelectContent>{options.services.map((item) => <SelectItem key={item.serviceId} value={item.serviceId}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <CalendarDatePickerField
              label="Booking Date"
              value={date}
              onChange={(value) => {
                setDate(value);
                void runAvailabilityCheck(effectiveServiceId, value, time);
              }}
            />
            <TimeSelectInput
              label="Booking Time"
              value={time}
              onChange={(value) => {
                setTime(value);
                void runAvailabilityCheck(effectiveServiceId, date, value);
              }}
            />
            {availability.kind === 'checking' ? (
              <p className="-mt-2 text-xs text-muted-foreground">Checking availability…</p>
            ) : availability.kind === 'available' && availability.key === selection?.key ? (
              <p className="-mt-2 text-xs text-emerald-600 dark:text-emerald-400">Slot is available.</p>
            ) : availability.kind === 'conflict' && availability.key === selection?.key ? (
              <p className="-mt-2 text-xs text-destructive">{availability.message}</p>
            ) : null}
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={busy || !selectionAvailable} onClick={() => void handleCreate()}>Create booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
