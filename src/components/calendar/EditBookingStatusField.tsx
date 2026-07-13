import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  APPOINTMENT_BOOKING_STATUS_OPTIONS,
  type AppointmentBookingDisplayStatus,
} from '@/lib/appointmentBookingStatusPresentation';

type Props = {
  value: AppointmentBookingDisplayStatus;
  onValueChange: (value: AppointmentBookingDisplayStatus) => void;
  disabled?: boolean;
};

export function EditBookingStatusField({ value, onValueChange, disabled }: Props) {
  return (
    <Field data-disabled={disabled || undefined}>
      <FieldLabel htmlFor="dialog-booking-status">Status</FieldLabel>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id="dialog-booking-status" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {APPOINTMENT_BOOKING_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
