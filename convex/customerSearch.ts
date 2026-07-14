export type CustomerSearchSource = {
  name?: string;
  email?: string;
  phone?: string;
  contactAddress: string;
};

export function customerSearchText(customer: CustomerSearchSource) {
  return [customer.name, customer.email, customer.phone, customer.contactAddress]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value))
    .join(" ");
}
