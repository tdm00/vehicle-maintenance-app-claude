import { expect, test } from 'vitest';
import { currentOdometer, isBelowKnownOdometer } from '../../src/domain/odometer';
import { fill, record, vehicle } from './builders';

test('uses the entered value with no logs', () => {
  expect(currentOdometer(vehicle(), [], [])).toBe(50_000);
});

test('a later fill-up moves the vehicle forward', () => {
  expect(currentOdometer(vehicle(), [], [fill({ odometer: 62_000 })])).toBe(62_000);
});

test('a later service record moves the vehicle forward', () => {
  expect(currentOdometer(vehicle(), [record({ odometer: 55_000 })], [])).toBe(55_000);
});

test('a lower reading never moves it backward', () => {
  expect(currentOdometer(vehicle(), [], [fill({ odometer: 40_000 })])).toBe(50_000);
});

test('ignores records with no mileage and other vehicles', () => {
  const records = [record(), record({ vehicleId: 'other', odometer: 90_000 })];
  const fills = [fill({ vehicleId: 'other', odometer: 95_000 })];
  expect(currentOdometer(vehicle(), records, fills)).toBe(50_000);
});

test.each([
  [49_000, 50_000, true],
  [50_000, 50_000, false],
  [51_000, 50_000, false],
  [undefined, 50_000, false],
])('isBelowKnownOdometer(%s, %i) is %s', (reading, known, expected) => {
  expect(isBelowKnownOdometer(reading, known)).toBe(expected);
});
