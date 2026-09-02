export const DEFAULT_AVAILABILITY_SHIFTS = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startMinutes: 9 * 60,
  endMinutes: 17 * 60,
}));
