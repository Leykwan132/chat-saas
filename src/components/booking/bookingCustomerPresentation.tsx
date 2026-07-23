import type { ElementType } from 'react';
import { Globe, ScanFace, UserRoundPlus } from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { getPlatformIconClassName } from '../../lib/platformIconStyles';
import type { BookingCustomer, BookingCustomerDetails } from './bookingDialogTypes';

export function bookingCustomerSearchText(customer: BookingCustomer) {
  return [customer.name, customer.phone, customer.email, customer.contactAddress]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value))
    .join(' ');
}

export function bookingCustomerMatchesQuery(customer: BookingCustomer, query: string) {
  return bookingCustomerSearchText(customer).includes(query.trim().toLowerCase());
}

export function bookingCustomerLabel(customer: BookingCustomerDetails) {
  return customer.name?.trim()
    || customer.email
    || customer.phone
    || customer.contactAddress
    || 'Unnamed customer';
}

export function bookingCustomerDetail(customer: BookingCustomerDetails) {
  return customer.email || customer.phone || customer.contactAddress;
}

const sourceMeta = {
  whatsapp: {
    label: 'WhatsApp',
    Icon: SiWhatsapp,
    iconClassName: getPlatformIconClassName('whatsapp'),
  },
  instagram: {
    label: 'Instagram',
    Icon: SiInstagram,
    iconClassName: getPlatformIconClassName('instagram'),
  },
  messenger: {
    label: 'Messenger',
    Icon: SiMessenger,
    iconClassName: getPlatformIconClassName('messenger'),
  },
  web: {
    label: 'Web',
    Icon: Globe,
    iconClassName: getPlatformIconClassName('web'),
  },
  avatar: {
    label: 'Avatar',
    Icon: ScanFace,
    iconClassName: getPlatformIconClassName('avatar'),
  },
  manual: {
    label: 'Imported',
    Icon: UserRoundPlus,
    iconClassName: 'text-muted-foreground',
  },
} satisfies Record<NonNullable<BookingCustomer['service']>, {
  label: string;
  Icon: ElementType;
  iconClassName: string;
}>;

export function bookingCustomerSource(customer: Pick<BookingCustomer, 'service'>) {
  return sourceMeta[customer.service];
}
