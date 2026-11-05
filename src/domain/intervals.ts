import { MAKE_OVERRIDES } from '../data/makeOverrides';
import type { ServiceType, Vehicle } from './schemas';

export const HIGH_MILEAGE = 150_000;
const LEGACY_OIL_YEAR = 2000;
const MODERN_OIL_YEAR = 2015;
/** Wear items worth checking sooner once a vehicle is high mileage. */
const HIGH_MILEAGE_TYPES = new Set(['oil-change', 'transmission-fluid', 'coolant']);
/** Services that make no sense on two wheels. */
const NOT_FOR_MOTORCYCLES = new Set(['cabin-air-filter', 'tire-rotation', 'wiper-blades']);

export interface Interval {
  miles: number | null;
  months: number | null;
}

export function appliesToVehicle(
  type: ServiceType,
  vehicle: Pick<Vehicle, 'powertrain' | 'bodyType' | 'ignoredServiceTypeIds'>,
): boolean {
  if (type.isHidden || vehicle.ignoredServiceTypeIds.includes(type.id)) return false;
  if (!type.powertrains.includes(vehicle.powertrain)) return false;
  if (vehicle.bodyType === 'motorcycle' && NOT_FOR_MOTORCYCLES.has(type.id)) return false;
  return type.intervalMiles !== null || type.intervalMonths !== null;
}

function oilInterval(vehicle: Pick<Vehicle, 'powertrain' | 'year'>, base: Interval): Interval {
  if (vehicle.powertrain === 'diesel') return { miles: 10_000, months: 12 };
  if (vehicle.year < LEGACY_OIL_YEAR) return { miles: 3_000, months: 3 };
  if (vehicle.year >= MODERN_OIL_YEAR) return { miles: 7_500, months: 12 };
  return base;
}

/**
 * Layers general guidance from broadest to most specific: catalog interval, powertrain and age,
 * make override, then a high-mileage tightening. Intervals the user edited always win.
 */
export function effectiveInterval(
  type: ServiceType,
  vehicle: Pick<Vehicle, 'make' | 'year' | 'powertrain'>,
  odometer: number,
): Interval {
  const base: Interval = { miles: type.intervalMiles, months: type.intervalMonths };
  if (type.isCustom || type.intervalsEdited) return base;

  let interval = type.id === 'oil-change' ? oilInterval(vehicle, base) : base;

  const override = MAKE_OVERRIDES.find(
    (entry) =>
      entry.serviceTypeId === type.id &&
      entry.makes.includes(vehicle.make) &&
      vehicle.year >= entry.fromYear,
  );
  if (override) interval = { miles: override.miles, months: override.months };

  if (odometer >= HIGH_MILEAGE && HIGH_MILEAGE_TYPES.has(type.id)) {
    interval = {
      miles: interval.miles === null ? null : Math.round(interval.miles * 0.8),
      months: interval.months === null ? null : Math.max(1, Math.round(interval.months * 0.8)),
    };
  }
  return interval;
}
