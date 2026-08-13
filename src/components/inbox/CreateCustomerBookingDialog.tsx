import { useAction, useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { CreateBookingDialog } from '@/components/booking/CreateBookingDialog';

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
  if (!agentId) throw new Error('Missing agent ID');
  const options = useQuery(
    api.appointmentBooking.manualBooking.getCreateOptions,
    open ? { conversationId } : 'skip',
  );
  const checkAvailability = useMutation(api.appointmentBooking.manualBooking.checkAvailability);
  const createBooking = useAction(api.appointmentBooking.manualBooking.create);
  const loadNearestSlot = useMutation(api.appointmentBooking.manualBooking.getNextAvailableSlot);

  return (
    <CreateBookingDialog
      open={open}
      onOpenChange={onOpenChange}
      agentId={agentId}
      services={options?.services}
      fixedCustomer={options?.customer}
      loadNearestSlot={(serviceId) => loadNearestSlot({ conversationId, serviceId })}
      checkAvailability={(input) => checkAvailability({ conversationId, ...input })}
      createBooking={(input) => createBooking({ conversationId, ...input })}
    />
  );
}
