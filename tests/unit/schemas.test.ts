import { describe, expect, test } from 'vitest';
import {
  fuelFillUpSchema,
  garageDataSchema,
  isoDate,
  serviceRecordSchema,
  vehicleSchema,
} from '../../src/domain/schemas';
import { fill, garage, record, serviceType, vehicle } from './builders';

describe('isoDate', () => {
  test.each(['2026-01-31', '2024-02-29'])('accepts %s', (value) => {
    expect(isoDate.safeParse(value).success).toBe(true);
  });
  test.each(['2026-02-30', '2026-13-01', '1/2/2026', '', '2026-1-1'])('rejects %s', (value) => {
    expect(isoDate.safeParse(value).success).toBe(false);
  });
});

describe('vehicle', () => {
  test('accepts a valid vehicle', () => {
    expect(vehicleSchema.safeParse(vehicle()).success).toBe(true);
  });

  test.each([
    ['script in color', { color: 'red"><script>' }],
    ['short color', { color: '#fff' }],
    ['blank description', { description: '   ' }],
    ['negative mileage', { enteredOdometer: -1 }],
    ['fractional mileage', { enteredOdometer: 1.5 }],
    ['unknown powertrain', { powertrain: 'steam' }],
    ['unknown body', { bodyType: 'boat' }],
  ])('rejects %s', (_label, overrides) => {
    expect(vehicleSchema.safeParse({ ...vehicle(), ...overrides }).success).toBe(false);
  });
});

test('a service record needs at least one service, and cost and mileage are optional', () => {
  expect(serviceRecordSchema.safeParse(record()).success).toBe(true);
  expect(serviceRecordSchema.safeParse(record({ serviceTypeIds: [] })).success).toBe(false);
});

test.each([
  ['zero gallons', { gallons: 0 }],
  ['negative gallons', { gallons: -2 }],
  ['negative cost', { costCents: -1 }],
  ['fractional cents', { costCents: 10.5 }],
])('a fill-up rejects %s', (_label, overrides) => {
  expect(fuelFillUpSchema.safeParse(fill(overrides)).success).toBe(false);
});

test('the whole document validates', () => {
  const data = garage({
    vehicles: [vehicle()],
    serviceRecords: [record()],
    fuelFillUps: [fill()],
    serviceTypes: [serviceType()],
  });
  expect(garageDataSchema.safeParse(data).success).toBe(true);
  expect(garageDataSchema.safeParse({ vehicles: 'nope' }).success).toBe(false);
});
