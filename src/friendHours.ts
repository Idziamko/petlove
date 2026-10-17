import type { Friend } from './api';

export function friendHours(days: Friend['workDays']) {
  if (!days?.length) return 'Not provided';
  const openDay = days.find(day => day.isOpen);
  if (!openDay) return 'Closed';
  if (!openDay.from || !openDay.to) return 'By appointment';
  if (openDay.from === '00:00' && ['00:00', '23:59', '24:00'].includes(openDay.to)) return 'Day and night';
  return `${openDay.from} - ${openDay.to}`;
}
