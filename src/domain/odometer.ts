import type { FuelFillUp, ServiceRecord, Vehicle } from './schemas';

/** The vehicle's mileage is the highest reading anywhere, so no entry can leave it stale. */
export function currentOdometer(
  vehicle: Pick<Vehicle, 'id' | 'enteredOdometer'>,
  records: Pick<ServiceRecord, 'vehicleId' | 'odometer'>[],
  fillUps: Pick<FuelFillUp, 'vehicleId' | 'odometer'>[],
): number {
  let highest = vehicle.enteredOdometer;
  for (const entry of [...records, ...fillUps]) {
    if (entry.vehicleId === vehicle.id && entry.odometer !== undefined) {
      highest = Math.max(highest, entry.odometer);
    }
  }
  return highest;
}

export interface LoggedReading {
  source: 'service' | 'fuel';
  date: string;
  odometer: number;
}

/** The highest logged reading, which is what to fix when the vehicle's mileage looks wrong. */
export function highestLoggedReading(
  vehicleId: string,
  records: Pick<ServiceRecord, 'vehicleId' | 'odometer' | 'date'>[],
  fillUps: Pick<FuelFillUp, 'vehicleId' | 'odometer' | 'date'>[],
): LoggedReading | null {
  let highest: LoggedReading | null = null;
  const consider = (source: LoggedReading['source'], entries: typeof records) => {
    for (const { vehicleId: owner, odometer, date } of entries) {
      if (owner === vehicleId && odometer !== undefined && odometer > (highest?.odometer ?? -1)) {
        highest = { source, date, odometer };
      }
    }
  };
  consider('service', records);
  consider('fuel', fillUps);
  return highest;
}

/** Far enough past the known mileage that a typo is likelier than real driving. */
export const IMPLAUSIBLE_JUMP_MILES = 25_000;

export function isImplausibleJump(reading: number | undefined, known: number): boolean {
  return reading !== undefined && reading - known > IMPLAUSIBLE_JUMP_MILES;
}

/** True when a reading is below the highest one known, which usually means a typo. */
export function isBelowKnownOdometer(reading: number | undefined, known: number): boolean {
  return reading !== undefined && reading < known;
}
