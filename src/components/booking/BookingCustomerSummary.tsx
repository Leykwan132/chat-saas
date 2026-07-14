import type { ReactNode } from 'react';
import type { BookingCustomer, BookingCustomerDetails } from './bookingDialogTypes';
import {
  bookingCustomerDetail,
  bookingCustomerLabel,
  bookingCustomerSource,
} from './bookingCustomerPresentation';

export function BookingCustomerSummary({
  customer,
  action,
}: {
  customer: BookingCustomerDetails;
  action?: ReactNode;
}) {
  const source = customer.service
    ? bookingCustomerSource({ service: customer.service } as Pick<BookingCustomer, 'service'>)
    : null;
  const Icon = source?.Icon;
  const detail = bookingCustomerDetail(customer);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
      {source && Icon ? <Icon aria-label={source.label} className={source.iconClassName} /> : null}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{bookingCustomerLabel(customer)}</span>
        {detail ? (
          <span className="block truncate text-xs text-muted-foreground">{detail}</span>
        ) : null}
      </span>
      {action ? <span className="ml-auto shrink-0">{action}</span> : null}
    </div>
  );
}
