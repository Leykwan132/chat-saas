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

export function getSelectedBookingServices<
  T extends { _id: string; isActive: boolean },
>(
  allowedServiceIds: readonly T['_id'][] | undefined,
  services: readonly T[],
) {
  const selectedServiceIds = new Set(getEffectiveBookingServiceIds(allowedServiceIds, services));
  return services.filter((service) => service.isActive && selectedServiceIds.has(service._id));
}

export function bookingTeammateAvailabilityLabel(count: number) {
  return count === 1 ? '1 teammate available' : `${count} teammates available`;
}
