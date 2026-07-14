import { useRef, useState } from 'react';
import { format } from 'date-fns';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  buildManualBookingCollectedFields,
  defaultManualBookingEndTime,
  getManualBookingSelection,
} from '@/components/inbox/manualBookingScheduleModel';
import type { ManualBookingScheduleFeedback } from '@/components/inbox/ManualBookingScheduleField';
import type {
  BookingAvailabilityResult,
  BookingCreateInput,
  BookingCustomerDetails,
  BookingIntervalInput,
  BookingService,
} from './bookingDialogTypes';

type AvailabilityStatus =
  | { kind: 'idle' }
  | { kind: 'checking'; key: string }
  | { kind: 'available'; key: string }
  | { kind: 'conflict'; key: string; message: string };

export function useCreateBookingController({
  services,
  customer,
  initialDate,
  checkAvailability,
  createBooking,
}: {
  services: BookingService[];
  customer: BookingCustomerDetails | null;
  initialDate?: string;
  checkAvailability: (input: BookingIntervalInput) => Promise<BookingAvailabilityResult>;
  createBooking: (input: BookingCreateInput) => Promise<unknown>;
}) {
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(initialDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [availability, setAvailability] = useState<AvailabilityStatus>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const availabilityRequestRef = useRef(0);
  const endTimeCustomizedRef = useRef(false);
  const effectiveServiceId = serviceId || services[0]?.serviceId || '';
  const effectiveFields = {
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
  };
  const service = services.find((item) => item.serviceId === effectiveServiceId);
  const selection = service
    ? getManualBookingSelection(effectiveServiceId, date, startTime, endTime, service.timeZone)
    : { kind: 'incomplete' as const };
  const selectionAvailable = customer !== null && selection.kind === 'ready'
    && availability.kind === 'available' && availability.key === selection.key;
  const feedback: ManualBookingScheduleFeedback = selection.kind === 'invalid'
    ? { kind: 'invalid', message: selection.message }
    : selection.kind === 'ready' && availability.kind !== 'idle' && availability.key === selection.key
      ? availability.kind === 'checking' ? { kind: 'checking' }
        : availability.kind === 'available' ? { kind: 'available' }
          : availability.kind === 'conflict' ? { kind: 'conflict', message: availability.message }
            : { kind: 'idle' }
      : { kind: 'idle' };

  const runAvailabilityCheck = async (nextServiceId: string, nextDate: string, nextStart: string, nextEnd: string) => {
    const requestId = ++availabilityRequestRef.current;
    const nextService = services.find((item) => item.serviceId === nextServiceId);
    const nextSelection = nextService
      ? getManualBookingSelection(nextServiceId, nextDate, nextStart, nextEnd, nextService.timeZone)
      : { kind: 'incomplete' as const };
    if (customer === null || nextSelection.kind !== 'ready') {
      setAvailability({ kind: 'idle' });
      return;
    }
    setAvailability({ kind: 'checking', key: nextSelection.key });
    try {
      const result = await checkAvailability({
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

  const resetCustomerFields = () => {
    setAvailability({ kind: 'idle' });
  };

  return {
    serviceId: effectiveServiceId, date, startTime, endTime, remarks,
    feedback, selectionAvailable, busy, resetCustomerFields, setRemarks,
    setService(value: string) {
      const nextService = services.find((item) => item.serviceId === value);
      const nextEnd = nextService ? defaultManualBookingEndTime(startTime, nextService.durationMinutes) : '';
      setServiceId(value); setEndTime(nextEnd); endTimeCustomizedRef.current = false;
      void runAvailabilityCheck(value, date, startTime, nextEnd);
    },
    setDate(value: string) { setDate(value); void runAvailabilityCheck(effectiveServiceId, value, startTime, endTime); },
    setStartTime(value: string) {
      const nextEnd = !endTimeCustomizedRef.current && service ? defaultManualBookingEndTime(value, service.durationMinutes) : endTime;
      setStartTime(value); setEndTime(nextEnd); void runAvailabilityCheck(effectiveServiceId, date, value, nextEnd);
    },
    setEndTime(value: string) {
      endTimeCustomizedRef.current = true; setEndTime(value);
      void runAvailabilityCheck(effectiveServiceId, date, startTime, value);
    },
    async submit() {
      if (!selectionAvailable || selection.kind !== 'ready') return false;
      setBusy(true);
      try {
        await createBooking({
          serviceId: effectiveServiceId as Id<'appointmentServices'>,
          collectedFields: buildManualBookingCollectedFields(effectiveFields, date, startTime),
          startAt: selection.startAt,
          endAt: selection.endAt,
          remarks: remarks.trim() || undefined,
        });
        return true;
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        setAvailability({ kind: 'conflict', key: selection.key, message: error.message });
        throw error;
      } finally {
        setBusy(false);
      }
    },
  };
}
