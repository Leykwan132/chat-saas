type CustomerPhoneSource = {
  contactAddress: string;
  phone?: string;
  whatsappUserId?: string;
};

function isPhoneNumber(value: string): boolean {
  return /^\+?[\d\s().-]+$/.test(value) && /\d/.test(value);
}

export function customerPhonePresentation(customer: CustomerPhoneSource): string | null {
  const phone = customer.phone?.trim();
  if (phone && isPhoneNumber(phone)) return phone;

  const contactAddress = customer.contactAddress.trim();
  if (customer.whatsappUserId?.trim() || !isPhoneNumber(contactAddress)) {
    return null;
  }

  return contactAddress;
}
