import { useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { CreateBookingDialog } from '@/components/booking/CreateBookingDialog';

export function CalendarCreateBookingDialog({
  open,
  onOpenChange,
  agentId,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: Id<'agents'>;
  initialDate: string;
}) {
  const [customerQuery, setCustomerQuery] = useState('');
  const services = useQuery(
    api.appointmentBooking.calendarManualBooking.getCreateOptions,
    open ? { agentId } : 'skip',
  );
  const customers = useQuery(api.calendarEvents.listCustomerOptions, open ? {} : 'skip');
  const checkAvailability = useMutation(api.appointmentBooking.calendarManualBooking.checkAvailability);
  const createBooking = useAction(api.appointmentBooking.calendarManualBooking.create);

  return (
    <CreateBookingDialog
      open={open}
      onOpenChange={onOpenChange}
      agentId={agentId}
      initialDate={initialDate}
      services={services}
      customers={customers}
      customerQuery={customerQuery}
      onCustomerQueryChange={setCustomerQuery}
      checkAvailability={(input) => {
        if (!input.customerId) throw new Error('Select a customer');
        return checkAvailability({
          agentId,
          customerId: input.customerId,
          serviceId: input.serviceId,
          startAt: input.startAt,
          endAt: input.endAt,
        });
      }}
      createBooking={(input) => {
        if (!input.customerId) throw new Error('Select a customer');
        return createBooking({
          agentId,
          customerId: input.customerId,
          serviceId: input.serviceId,
          collectedFields: input.collectedFields,
          title: input.title,
          startAt: input.startAt,
          endAt: input.endAt,
        });
      }}
    />
  );
}
