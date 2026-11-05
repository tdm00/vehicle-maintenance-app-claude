import { formatDate } from '../domain/dates';
import type { MaintenanceItem, MaintenanceStatus } from '../domain/maintenance';

export const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  overdue: 'Overdue',
  dueSoon: 'Due soon',
  noRecord: 'No record',
  ok: 'OK',
};

function miles(value: number) {
  return `${Math.abs(value).toLocaleString('en-US')} mi`;
}

/** One short line saying why an item has its status. */
export function describeItem(item: MaintenanceItem): string {
  const { status, milesRemaining, daysRemaining, dueDate, lastDate } = item;

  if (status === 'noRecord') return 'No service on record';

  const milesPast = milesRemaining !== null && milesRemaining < 0;
  const datePast = daysRemaining !== null && daysRemaining < 0;

  if (status === 'overdue') {
    if (milesPast && milesRemaining !== null) return `${miles(milesRemaining)} past due`;
    if (datePast && dueDate) return `Was due ${formatDate(dueDate)}`;
  }

  const parts: string[] = [];
  if (milesRemaining !== null) parts.push(`${miles(milesRemaining)} left`);
  if (dueDate) parts.push(`due ${formatDate(dueDate)}`);
  if (parts.length > 0) {
    const text = parts.join(' or ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  return lastDate ? `Last done ${formatDate(lastDate)}` : '';
}
