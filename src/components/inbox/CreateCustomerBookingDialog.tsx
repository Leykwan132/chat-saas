import { useMemo, useState } from 'react';
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

type CollectedFields = Record<string, string | number | boolean | null>;

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
  const listSlots = useMutation(api.appointmentBooking.manualBooking.listAvailableSlots);
  const createBooking = useMutation(api.appointmentBooking.manualBooking.create);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fields, setFields] = useState<CollectedFields>({});
  const [slots, setSlots] = useState<Array<{ startAt: number; endAt: number; assignedDisplayName?: string }>>([]);
  const [selectedStartAt, setSelectedStartAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const effectiveServiceId = serviceId || options?.services[0]?.serviceId || '';
  const effectiveFields = Object.keys(fields).length > 0
    ? fields
    : {
        name: options?.customer.name ?? '',
        email: options?.customer.email ?? '',
        phone: options?.customer.phone ?? '',
      };
  const service = options?.services.find((item) => item.serviceId === effectiveServiceId);

  const dayRange = useMemo(() => {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { startAt: start.getTime(), endAt: end.getTime() };
  }, [date]);

  const updateField = (key: string, value: string | number | boolean) => {
    setFields((current) => ({
      ...(Object.keys(current).length > 0 ? current : effectiveFields),
      [key]: value,
    }));
    setSlots([]);
    setSelectedStartAt(null);
  };

  const handleFindTimes = async () => {
    if (!effectiveServiceId) return;
    setBusy(true);
    try {
      const result = await listSlots({
        conversationId,
        serviceId: effectiveServiceId as Id<'appointmentServices'>,
        collectedFields: effectiveFields,
        rangeStartAt: dayRange.startAt,
        rangeEndAt: dayRange.endAt,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setSlots(result.slots);
      setSelectedStartAt(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load available times');
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!effectiveServiceId || selectedStartAt === null) return;
    setBusy(true);
    try {
      await createBooking({
        conversationId,
        serviceId: effectiveServiceId as Id<'appointmentServices'>,
        collectedFields: effectiveFields,
        startAt: selectedStartAt,
      });
      toast.success('Booking created');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create booking');
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
              <Select value={effectiveServiceId} onValueChange={(value) => { setServiceId(value); setSlots([]); setSelectedStartAt(null); }}>
                <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                <SelectContent>{options.services.map((item) => <SelectItem key={item.serviceId} value={item.serviceId}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(service?.fields ?? []).map((field) => (
              <div key={field.key} className="grid gap-2">
                <Label>{field.label}</Label>
                {field.type === 'select' ? (
                  <Select value={String(effectiveFields[field.key] ?? '')} onValueChange={(value) => updateField(field.key, value)}>
                    <SelectTrigger><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>{field.options?.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                ) : field.type === 'boolean' ? (
                  <Button type="button" variant="outline" onClick={() => updateField(field.key, effectiveFields[field.key] !== true)}>{effectiveFields[field.key] === true ? 'Yes' : 'No'}</Button>
                ) : (
                  <Input type={field.type === 'number' ? 'number' : field.type === 'phone' ? 'tel' : field.type} value={String(effectiveFields[field.key] ?? '')} onChange={(event) => updateField(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)} />
                )}
              </div>
            ))}
            <CalendarDatePickerField value={date} onChange={(value) => { setDate(value); setSlots([]); setSelectedStartAt(null); }} />
            <Button type="button" variant="outline" disabled={busy} onClick={() => void handleFindTimes()}>{busy ? 'Loading…' : 'Find available times'}</Button>
            {slots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot) => <Button key={slot.startAt} type="button" variant={selectedStartAt === slot.startAt ? 'default' : 'outline'} onClick={() => setSelectedStartAt(slot.startAt)}>{format(new Date(slot.startAt), 'h:mm a')}</Button>)}
              </div>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={busy || selectedStartAt === null} onClick={() => void handleCreate()}>Create booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
