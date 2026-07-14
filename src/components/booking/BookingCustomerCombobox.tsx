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
import {
  bookingCustomerDetail,
  bookingCustomerLabel,
  bookingCustomerSearchText,
  bookingCustomerSource,
} from './bookingCustomerPresentation';

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
      itemToStringLabel={bookingCustomerLabel}
      itemToStringValue={bookingCustomerLabel}
      isItemEqualToValue={(customer, selected) => customer._id === selected._id}
      filter={(customer, query) =>
        bookingCustomerSearchText(customer).includes(query.trim().toLowerCase())
      }
    >
      <ComboboxInput
        aria-label="Customer"
        placeholder="Search customers"
        className="h-10 w-full rounded-md border-input bg-background"
      />
      <ComboboxContent portalContainer={portalContainer} className="min-w-72 rounded-xl">
        <ComboboxEmpty>No customers found.</ComboboxEmpty>
        <ComboboxList className="max-h-64 overflow-y-auto">
          {(customer) => {
            const source = bookingCustomerSource(customer);
            const Icon = source.Icon;
            const detail = bookingCustomerDetail(customer);
            return (
              <ComboboxItem key={customer._id} value={customer} className="rounded-lg px-3 py-2.5">
                <Icon aria-label={source.label} className={source.iconClassName} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{bookingCustomerLabel(customer)}</span>
                  {detail ? (
                    <span className="block truncate text-xs text-muted-foreground">{detail}</span>
                  ) : null}
                </span>
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
