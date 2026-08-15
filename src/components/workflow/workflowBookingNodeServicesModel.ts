export function getEffectiveBookingServiceIds<T extends string>(
  allowedServiceIds: readonly T[] | undefined,
  services: readonly { _id: T }[],
) {
  return allowedServiceIds ? [...allowedServiceIds] : services.map((service) => service._id);
}

export function getUpdatedBookingServiceIds<T extends string>(
  serviceIds: readonly T[],
  serviceId: T,
  checked: boolean,
) {
  const nextIds = new Set(serviceIds);
  if (checked) nextIds.add(serviceId);
  else nextIds.delete(serviceId);
  return [...nextIds];
}

export function bookingTeammateAvailabilityLabel(count: number) {
  return count === 1 ? '1 teammate available' : `${count} teammates available`;
}
