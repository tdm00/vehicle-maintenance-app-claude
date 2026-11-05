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

/** True when a reading is below the highest one known, which usually means a typo. */
export function isBelowKnownOdometer(reading: number | undefined, known: number): boolean {
  return reading !== undefined && reading < known;
}
