import type * as React from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import type { BookingCustomer } from './bookingDialogTypes';

function customerLabel(customer: BookingCustomer) {
  return customer.name?.trim() || customer.email || customer.phone || customer.contactAddress || 'Unnamed customer';
}

function customerDetail(customer: BookingCustomer) {
  return customer.email || customer.phone || customer.contactAddress;
}

export function BookingCustomerCombobox({
  customers,
  value,
  inputValue,
  onInputValueChange,
  onValueChange,
  portalContainer,
}: {
  customers: BookingCustomer[];
  value: BookingCustomer | null;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  onValueChange: (value: BookingCustomer | null) => void;
  portalContainer?: React.RefObject<HTMLElement | null>;
}) {
  return (
    <Combobox
      items={customers}
      value={value}
      inputValue={inputValue}
      onInputValueChange={onInputValueChange}
      onValueChange={onValueChange}
      itemToStringLabel={customerLabel}
      itemToStringValue={customerLabel}
      isItemEqualToValue={(customer, selected) => customer._id === selected._id}
      filter={null}
    >
      <ComboboxInput
        aria-label="Customer"
        placeholder="Search customers"
        className="h-10 w-full rounded-md border-input bg-background"
      />
      <ComboboxContent portalContainer={portalContainer} className="min-w-72 rounded-xl">
        <ComboboxEmpty>No customers found.</ComboboxEmpty>
        <ComboboxList className="max-h-64 overflow-y-auto">
          {(customer) => (
            <ComboboxItem key={customer._id} value={customer} className="rounded-lg px-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate font-medium">{customerLabel(customer)}</span>
                {customerDetail(customer) ? (
                  <span className="block truncate text-xs text-muted-foreground">{customerDetail(customer)}</span>
                ) : null}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
