import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  buildManualBookingCollectedFields,
  defaultManualBookingEndTime,
  getManualBookingSelection,
  manualBookingScheduleFromSlot,
} from '@/components/inbox/manualBookingScheduleModel';
import type { ManualBookingScheduleFeedback } from '@/components/inbox/ManualBookingScheduleField';
import type {
  BookingAvailabilityResult,
  BookingCreateInput,
  BookingCustomerDetails,
  BookingDefaultSlot,
  BookingIntervalInput,
  BookingService,
} from './bookingDialogTypes';

type AvailabilityStatus =
  | { kind: 'idle' }
  | { kind: 'checking'; key: string }
  | { kind: 'available'; key: string }
  | { kind: 'conflict'; key: string; message: string };

function defaultManualBookingTitle(
  service: BookingService | undefined,
  customer: BookingCustomerDetails | null,
) {
  if (service === undefined) return '';
  const customerName = customer?.name?.trim()
    || customer?.email?.trim()
    || customer?.phone?.trim()
    || customer?.contactAddress?.trim()
    || 'Customer';
  return `${service.name} - ${customerName}`;
}

export function useCreateBookingController({
  services,
  customer,
  initialDate,
  checkAvailability,
  createBooking,
  loadNearestSlot,
}: {
  services: BookingService[];
  customer: BookingCustomerDetails | null;
  initialDate?: string;
  checkAvailability: (input: BookingIntervalInput) => Promise<BookingAvailabilityResult>;
  createBooking: (input: BookingCreateInput) => Promise<unknown>;
  loadNearestSlot?: (serviceId: Id<'appointmentServices'>) => Promise<BookingDefaultSlot | null>;
}) {
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(initialDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');
  const [remarks, setRemarks] = useState('');
  const [availability, setAvailability] = useState<AvailabilityStatus>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const availabilityRequestRef = useRef(0);
  const nearestSlotRequestRef = useRef(0);
  const loadNearestSlotRef = useRef(loadNearestSlot);
  const checkAvailabilityRef = useRef(checkAvailability);
  const customerRef = useRef(customer);
  const previousCustomerRef = useRef(customer);
  const endTimeCustomizedRef = useRef(false);
  const titleCustomizedRef = useRef(false);
  loadNearestSlotRef.current = loadNearestSlot;
  checkAvailabilityRef.current = checkAvailability;
  customerRef.current = customer;
  const effectiveServiceId = serviceId || services[0]?.serviceId || '';
  const effectiveFields = {
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
  };
  const service = services.find((item) => item.serviceId === effectiveServiceId);
  const defaultTitle = defaultManualBookingTitle(service, customer);
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
    if (customerRef.current === null || nextSelection.kind !== 'ready') {
      setAvailability({ kind: 'idle' });
      return;
    }
    setAvailability({ kind: 'checking', key: nextSelection.key });
    try {
      const result = await checkAvailabilityRef.current({
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

  useEffect(() => {
    const loadNearestSlot = loadNearestSlotRef.current;
    if (!service || !loadNearestSlot) return;
    const requestId = ++nearestSlotRequestRef.current;
    void (async () => {
      const slot = await loadNearestSlot(service.serviceId);
      if (nearestSlotRequestRef.current !== requestId || slot === null) return;
      const nextSchedule = manualBookingScheduleFromSlot(slot, service.timeZone);
      endTimeCustomizedRef.current = false;
      setDate(nextSchedule.date);
      setStartTime(nextSchedule.startTime);
      setEndTime(nextSchedule.endTime);
      void runAvailabilityCheck(
        service.serviceId,
        nextSchedule.date,
        nextSchedule.startTime,
        nextSchedule.endTime,
      );
    })();
  }, [effectiveServiceId, service?.timeZone]);

  useEffect(() => {
    if (!titleCustomizedRef.current) setTitle(defaultTitle);
  }, [defaultTitle]);

  useEffect(() => {
    const previousCustomer = previousCustomerRef.current;
    previousCustomerRef.current = customer;
    if (customer === previousCustomer) return;
    if (customer === null || selection.kind !== 'ready') {
      setAvailability({ kind: 'idle' });
      return;
    }
    void runAvailabilityCheck(effectiveServiceId, date, startTime, endTime);
  }, [customer, effectiveServiceId, date, startTime, endTime]);

  return {
    serviceId: effectiveServiceId, date, startTime, endTime, title, remarks,
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
    setTitle(value: string) {
      titleCustomizedRef.current = true;
      setTitle(value);
    },
    async submit() {
      if (!selectionAvailable || selection.kind !== 'ready') return false;
      setBusy(true);
      try {
        await createBooking({
          serviceId: effectiveServiceId as Id<'appointmentServices'>,
          collectedFields: buildManualBookingCollectedFields(effectiveFields, date, startTime),
          title: title.trim() || undefined,
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
