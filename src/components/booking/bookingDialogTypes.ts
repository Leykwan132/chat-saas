import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { ManualBookingCollectedFields } from '@/components/inbox/manualBookingScheduleModel';

export type BookingCustomerDetails = {
  _id?: Id<'customers'>;
  name?: string;
  email?: string;
  phone?: string;
  contactAddress?: string;
  service?: Doc<'customers'>['service'];
};

export type BookingCustomer = BookingCustomerDetails & {
  _id: Id<'customers'>;
  service: NonNullable<BookingCustomerDetails['service']>;
};

export type BookingServiceField = {
  key: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
};

export type BookingService = {
  serviceId: Id<'appointmentServices'>;
  name: string;
  durationMinutes: number;
  timeZone: string;
  fields: BookingServiceField[];
};

export type BookingIntervalInput = {
  customerId?: Id<'customers'>;
  serviceId: Id<'appointmentServices'>;
  startAt: number;
  endAt: number;
};

export type BookingCreateInput = BookingIntervalInput & {
  collectedFields: ManualBookingCollectedFields;
  title?: string;
  remarks?: string;
};

export type BookingAvailabilityResult =
  | { available: true }
  | { available: false; message: string };
