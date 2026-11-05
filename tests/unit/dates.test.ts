import { describe, expect, test } from 'vitest';
import { addDays, addMonths, daysBetween, formatDate, toLocalIso } from '../../src/domain/dates';

describe('addMonths', () => {
  test.each([
    ['2026-01-15', 1, '2026-02-15'],
    ['2026-01-31', 1, '2026-02-28'],
    ['2024-01-31', 1, '2024-02-29'],
    ['2026-11-30', 3, '2027-02-28'],
    ['2026-12-31', 12, '2027-12-31'],
    ['2026-03-31', -1, '2026-02-28'],
  ])('%s + %i months is %s', (start, months, expected) => {
    expect(addMonths(start, months)).toBe(expected);
  });
});

describe('daysBetween', () => {
  test.each([
    ['2026-01-01', '2026-01-01', 0],
    ['2026-01-01', '2026-01-31', 30],
    ['2026-01-31', '2026-01-01', -30],
    ['2026-03-07', '2026-03-09', 2], // spans a US daylight saving change
    ['2024-02-28', '2024-03-01', 2], // leap day
  ])('%s to %s is %i', (from, to, expected) => {
    expect(daysBetween(from, to)).toBe(expected);
  });
});

test.each([
  ['2026-11-04', 20, '2026-11-24'],
  ['2026-12-25', 10, '2027-01-04'],
  ['2024-02-28', 1, '2024-02-29'],
  ['2026-03-07', 2, '2026-03-09'], // spans a US daylight saving change
])('%s + %i days is %s', (start, days, expected) => {
  expect(addDays(start, days)).toBe(expected);
});

test('toLocalIso uses local calendar fields and pads them', () => {
  expect(toLocalIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  expect(toLocalIso(new Date(2026, 10, 15, 0, 1))).toBe('2026-11-15');
});

test('formatDate never shifts the day', () => {
  expect(formatDate('2026-03-01')).toBe('Mar 1, 2026');
});
