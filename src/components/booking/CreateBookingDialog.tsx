import { useRef, useState } from 'react';
import { CalendarCheck, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ManualBookingScheduleField } from '@/components/inbox/ManualBookingScheduleField';
import { BookingCustomerCombobox } from './BookingCustomerCombobox';
import { BookingCustomerSummary } from './BookingCustomerSummary';
import type {
  BookingAvailabilityResult,
  BookingCreateInput,
  BookingCustomer,
  BookingCustomerDetails,
  BookingIntervalInput,
  BookingService,
} from './bookingDialogTypes';
import { useCreateBookingController } from './useCreateBookingController';

export function CreateBookingDialog({
  open,
  onOpenChange,
  agentId,
  services,
  fixedCustomer,
  customers,
  customerQuery,
  onCustomerQueryChange,
  initialDate,
  checkAvailability,
  createBooking,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  services: BookingService[] | undefined;
  fixedCustomer?: BookingCustomerDetails;
  customers?: BookingCustomer[];
  customerQuery?: string;
  onCustomerQueryChange?: (value: string) => void;
  initialDate?: string;
  checkAvailability: (input: BookingIntervalInput) => Promise<BookingAvailabilityResult>;
  createBooking: (input: BookingCreateInput) => Promise<unknown>;
}) {
  const [selectedCustomer, setSelectedCustomer] = useState<BookingCustomer | null>(null);
  const customer = fixedCustomer ?? selectedCustomer;
  const comboboxPortalContainerRef = useRef<HTMLDivElement>(null);
  const controller = useCreateBookingController({
    services: services ?? [],
    customer,
    initialDate,
    checkAvailability: (input) => checkAvailability({ customerId: customer?._id, ...input }),
    createBooking: (input) => createBooking({ customerId: customer?._id, ...input }),
  });

  const handleCreate = async () => {
    try {
      if (!await controller.submit()) return;
      toast.success('Booking created');
      onOpenChange(false);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
        overlayClassName="bg-black/10 supports-backdrop-filter:backdrop-blur-none"
      >
        <div ref={comboboxPortalContainerRef} className="pointer-events-none absolute inset-0" />
        <DialogHeader><DialogTitle>Create booking</DialogTitle></DialogHeader>
        {services === undefined ? (
          <div className="h-32 rounded-md bg-muted motion-safe:animate-pulse" />
        ) : services.length === 0 ? (
          <Empty className="py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarCheck />
              </EmptyMedia>
              <EmptyTitle>No active services</EmptyTitle>
              <EmptyDescription>
                Create a service so you can book appointments.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link to={`/dashboard/${agentId}/services/new`}>
                  <Plus data-icon="inline-start" />
                  Create service
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-5">
            {fixedCustomer === undefined ? (
              <div className="grid gap-3">
                <Label>Customer</Label>
                {selectedCustomer === null ? (
                  <BookingCustomerCombobox
                    customers={customers ?? []}
                    value={selectedCustomer}
                    inputValue={customerQuery ?? ''}
                    onInputValueChange={(value) => onCustomerQueryChange?.(value)}
                    onValueChange={(value) => {
                      setSelectedCustomer(value);
                      controller.resetCustomerFields();
                    }}
                    portalContainer={comboboxPortalContainerRef}
                  />
                ) : (
                  <BookingCustomerSummary
                    customer={selectedCustomer}
                    action={(
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Change customer"
                        onClick={() => {
                          setSelectedCustomer(null);
                          onCustomerQueryChange?.('');
                          controller.resetCustomerFields();
                        }}
                      >
                        Change
                      </Button>
                    )}
                  />
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                <Label>Customer</Label>
                <BookingCustomerSummary customer={fixedCustomer} />
              </div>
            )}
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
              <Select value={controller.serviceId} onValueChange={controller.setService}>
                <SelectTrigger className="h-10 w-full px-3 text-sm">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent className="text-sm">
                  {services.map((item) => (
                    <SelectItem key={item.serviceId} value={item.serviceId} className="py-2.5 text-sm">
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ManualBookingScheduleField
              date={controller.date}
              startTime={controller.startTime}
              endTime={controller.endTime}
              feedback={controller.feedback}
              portalContainer={comboboxPortalContainerRef}
              onDateChange={controller.setDate}
              onStartTimeChange={controller.setStartTime}
              onEndTimeChange={controller.setEndTime}
            />
            <div className="grid gap-2">
              <Label htmlFor="manual-booking-remarks">Remarks</Label>
              <Textarea
                id="manual-booking-remarks"
                value={controller.remarks}
                onChange={(event) => controller.setRemarks(event.target.value)}
                placeholder="Add optional internal notes"
                className="min-h-20"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          {services !== undefined && services.length > 0 ? (
            <Button
              type="button"
              disabled={controller.busy || !controller.selectionAvailable}
              onClick={() => void handleCreate()}
            >
              {controller.busy && <Spinner data-icon="inline-start" />}
              Create booking
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
