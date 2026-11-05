import { addMonths, DAYS_PER_MONTH, daysBetween } from './dates';
import { appliesToVehicle, effectiveInterval, type Interval } from './intervals';
import { currentOdometer } from './odometer';
import type { GarageData, ServiceRecord, ServiceType, Vehicle } from './schemas';

export type MaintenanceStatus = 'overdue' | 'dueSoon' | 'noRecord' | 'ok';

export interface MaintenanceItem {
  vehicle: Vehicle;
  serviceType: ServiceType;
  status: MaintenanceStatus;
  interval: Interval;
  lastDate: string | null;
  lastOdometer: number | null;
  /** Negative when past due. Null when that dimension can't be evaluated. */
  milesRemaining: number | null;
  daysRemaining: number | null;
  dueDate: string | null;
}

const DUE_SOON_FRACTION = 0.1;

const RANK: Record<MaintenanceStatus, number> = { overdue: 0, dueSoon: 1, noRecord: 2, ok: 3 };

function latestRecord(records: ServiceRecord[], serviceTypeId: string): ServiceRecord | undefined {
  let latest: ServiceRecord | undefined;
  for (const record of records) {
    if (!record.serviceTypeIds.includes(serviceTypeId)) continue;
    if (
      !latest ||
      record.date > latest.date ||
      (record.date === latest.date && (record.odometer ?? 0) > (latest.odometer ?? 0))
    ) {
      latest = record;
    }
  }
  return latest;
}

function statusFor(remaining: number | null, interval: number | null): MaintenanceStatus {
  if (remaining === null || interval === null) return 'ok';
  if (remaining < 0) return 'overdue';
  return remaining <= interval * DUE_SOON_FRACTION ? 'dueSoon' : 'ok';
}

function worst(a: MaintenanceStatus, b: MaintenanceStatus): MaintenanceStatus {
  return RANK[a] <= RANK[b] ? a : b;
}

export function evaluateService(
  vehicle: Vehicle,
  serviceType: ServiceType,
  records: ServiceRecord[],
  odometer: number,
  today: string,
): MaintenanceItem {
  const interval = effectiveInterval(serviceType, vehicle, odometer);
  const latest = latestRecord(records, serviceType.id);

  if (!latest) {
    return {
      vehicle,
      serviceType,
      status: 'noRecord',
      interval,
      lastDate: null,
      lastOdometer: null,
      milesRemaining: null,
      daysRemaining: null,
      dueDate: null,
    };
  }

  const milesRemaining =
    interval.miles !== null && latest.odometer !== undefined
      ? latest.odometer + interval.miles - odometer
      : null;
  const dueDate = interval.months !== null ? addMonths(latest.date, interval.months) : null;
  const daysRemaining = dueDate !== null ? daysBetween(today, dueDate) : null;
  const intervalDays = interval.months !== null ? interval.months * DAYS_PER_MONTH : null;

  return {
    vehicle,
    serviceType,
    status: worst(
      statusFor(milesRemaining, interval.miles),
      statusFor(daysRemaining, intervalDays),
    ),
    interval,
    lastDate: latest.date,
    lastOdometer: latest.odometer ?? null,
    milesRemaining,
    daysRemaining,
    dueDate,
  };
}

function urgency(item: MaintenanceItem): number {
  // Compares miles and days on one scale: the fraction of the interval remaining.
  const fractions: number[] = [];
  if (item.milesRemaining !== null && item.interval.miles !== null) {
    fractions.push(item.milesRemaining / item.interval.miles);
  }
  if (item.daysRemaining !== null && item.interval.months !== null) {
    fractions.push(item.daysRemaining / (item.interval.months * DAYS_PER_MONTH));
  }
  return fractions.length > 0 ? Math.min(...fractions) : 0;
}

export function sortByUrgency(items: MaintenanceItem[]): MaintenanceItem[] {
  return [...items].sort(
    (a, b) =>
      RANK[a.status] - RANK[b.status] ||
      urgency(a) - urgency(b) ||
      a.serviceType.name.localeCompare(b.serviceType.name),
  );
}

/** Every applicable service for one vehicle, including those that are fine, most urgent first. */
export function evaluateVehicle(data: GarageData, vehicle: Vehicle, today: string) {
  const records = data.serviceRecords.filter((record) => record.vehicleId === vehicle.id);
  const odometer = currentOdometer(vehicle, data.serviceRecords, data.fuelFillUps);
  return sortByUrgency(
    data.serviceTypes
      .filter((type) => appliesToVehicle(type, vehicle))
      .map((type) => evaluateService(vehicle, type, records, odometer, today)),
  );
}

export interface TaskList {
  /** Overdue and due-soon items across every vehicle, most urgent first. */
  actionable: MaintenanceItem[];
  /** Services with no history, kept apart so a new vehicle doesn't flood the list. */
  noRecord: { vehicle: Vehicle; items: MaintenanceItem[] }[];
}

export function buildTaskList(data: GarageData, today: string): TaskList {
  const actionable: MaintenanceItem[] = [];
  const noRecord: TaskList['noRecord'] = [];

  for (const vehicle of data.vehicles) {
    const items = evaluateVehicle(data, vehicle, today);
    actionable.push(
      ...items.filter((item) => item.status === 'overdue' || item.status === 'dueSoon'),
    );
    const missing = items.filter((item) => item.status === 'noRecord');
    if (missing.length > 0) noRecord.push({ vehicle, items: missing });
  }

  return { actionable: sortByUrgency(actionable), noRecord };
}
