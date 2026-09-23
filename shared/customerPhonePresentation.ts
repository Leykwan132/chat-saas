type CustomerPhoneSource = {
  contactAddress: string;
  phone?: string;
  whatsappUserId?: string;
  service?: "whatsapp" | "instagram" | "messenger" | "web" | "avatar" | "manual";
};

function isPhoneNumber(value: string): boolean {
  return /^\+?[\d\s().-]+$/.test(value) && /\d/.test(value);
}

export function customerPhonePresentation(customer: CustomerPhoneSource): string | null {
  const phone = customer.phone?.trim();
  if (phone && isPhoneNumber(phone)) return phone;

  if (customer.service && customer.service !== "whatsapp") {
    return null;
  }

  const contactAddress = customer.contactAddress.trim();
  if (customer.whatsappUserId?.trim() || !isPhoneNumber(contactAddress)) {
    return null;
  }

  return contactAddress;
}
