import { describe, expect, test } from 'vitest';
import { DEFAULT_SERVICE_TYPES } from '../../src/data/serviceCatalog';
import { appliesToVehicle, effectiveInterval, HIGH_MILEAGE } from '../../src/domain/intervals';
import { serviceType, vehicle } from './builders';

const type = (id: string) => {
  const found = DEFAULT_SERVICE_TYPES.find((entry) => entry.id === id);
  if (!found) throw new Error(`No service type ${id}`);
  return found;
};

describe('appliesToVehicle', () => {
  test('EVs get no oil change, spark plugs, or engine air filter', () => {
    const ev = vehicle({ make: 'Tesla', powertrain: 'electric' });
    const applicable = DEFAULT_SERVICE_TYPES.filter((t) => appliesToVehicle(t, ev)).map(
      (t) => t.id,
    );
    expect(applicable).not.toContain('oil-change');
    expect(applicable).not.toContain('spark-plugs');
    expect(applicable).not.toContain('engine-air-filter');
    expect(applicable).not.toContain('transmission-fluid');
    expect(applicable).toContain('tire-rotation');
    expect(applicable).toContain('cabin-air-filter');
  });

  test('diesels get no spark plugs', () => {
    expect(appliesToVehicle(type('spark-plugs'), vehicle({ powertrain: 'diesel' }))).toBe(false);
  });

  test('motorcycles get no cabin filter or wipers', () => {
    const bike = vehicle({ bodyType: 'motorcycle' });
    expect(appliesToVehicle(type('cabin-air-filter'), bike)).toBe(false);
    expect(appliesToVehicle(type('wiper-blades'), bike)).toBe(false);
    expect(appliesToVehicle(type('oil-change'), bike)).toBe(true);
  });

  test('hidden and not-applicable services are skipped', () => {
    expect(appliesToVehicle(serviceType({ isHidden: true }), vehicle())).toBe(false);
    const ignoring = vehicle({ ignoredServiceTypeIds: ['oil-change'] });
    expect(appliesToVehicle(serviceType(), ignoring)).toBe(false);
  });

  test('a service with no intervals is never suggested', () => {
    const custom = serviceType({ intervalMiles: null, intervalMonths: null });
    expect(appliesToVehicle(custom, vehicle())).toBe(false);
  });
});

describe('effectiveInterval uses make, year, and mileage', () => {
  const oil = type('oil-change');

  test.each([
    ['base', { year: 2010 }, 5_000, 6],
    ['older vehicle', { year: 1995 }, 3_000, 3],
    ['modern vehicle', { year: 2020 }, 7_500, 12],
    ['diesel', { powertrain: 'diesel' as const }, 10_000, 12],
    ['make override', { make: 'Toyota', year: 2020 }, 10_000, 12],
    ['make override needs its year', { make: 'Toyota', year: 2016 }, 7_500, 12],
    ['other make override', { make: 'Subaru', year: 2020 }, 6_000, 6],
  ])('%s', (_label, overrides, miles, months) => {
    expect(effectiveInterval(oil, vehicle(overrides), 50_000)).toEqual({ miles, months });
  });

  test('high mileage tightens wear items', () => {
    expect(effectiveInterval(oil, vehicle(), HIGH_MILEAGE)).toEqual({ miles: 4_000, months: 5 });
    expect(effectiveInterval(oil, vehicle(), HIGH_MILEAGE - 1)).toEqual({
      miles: 5_000,
      months: 6,
    });
  });

  test('high mileage leaves other items alone', () => {
    expect(effectiveInterval(type('wiper-blades'), vehicle(), HIGH_MILEAGE)).toEqual({
      miles: null,
      months: 12,
    });
  });

  test('high mileage handles a missing dimension', () => {
    const fluid = serviceType({ id: 'coolant', intervalMiles: null, intervalMonths: 1 });
    expect(effectiveInterval(fluid, vehicle(), HIGH_MILEAGE)).toEqual({ miles: null, months: 1 });
    const milesOnly = serviceType({ id: 'coolant', intervalMiles: 100, intervalMonths: null });
    expect(effectiveInterval(milesOnly, vehicle(), HIGH_MILEAGE)).toEqual({
      miles: 80,
      months: null,
    });
  });

  test('intervals the user edited always win', () => {
    const edited = { ...oil, intervalMiles: 3_000, intervalMonths: 3, intervalsEdited: true };
    expect(effectiveInterval(edited, vehicle({ make: 'Toyota', year: 2024 }), 200_000)).toEqual({
      miles: 3_000,
      months: 3,
    });
  });

  test('custom services use their own intervals', () => {
    const custom = serviceType({
      id: 'detail',
      isCustom: true,
      intervalMiles: 1,
      intervalMonths: 2,
    });
    expect(effectiveInterval(custom, vehicle(), 200_000)).toEqual({ miles: 1, months: 2 });
  });
});
