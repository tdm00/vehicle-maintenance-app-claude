import { describe, expect, test } from 'vitest';
import { centsToInput, formatCents, parseDollars } from '../../src/domain/money';

describe('parseDollars', () => {
  test.each([
    ['45', 4500],
    ['45.5', 4550],
    ['45.50', 4550],
    ['$1,045.50', 104550],
    [' 19.99 ', 1999],
    ['0.07', 7],
    ['.5', 50],
    ['1.10', 110], // 1.1 * 100 is 110.00000000000001 as a float
    ['0', 0],
  ])('%s is %i cents', (input, cents) => {
    expect(parseDollars(input)).toBe(cents);
  });

  test.each(['', 'abc', '1.234', '-5', '1.2.3', '$', '.'])('rejects "%s"', (input) => {
    expect(parseDollars(input)).toBeNull();
  });
});

test('formats cents as USD', () => {
  expect(formatCents(104550)).toBe('$1,045.50');
  expect(formatCents(7)).toBe('$0.07');
});

test('round-trips through the input format', () => {
  expect(centsToInput(4550)).toBe('45.50');
  expect(parseDollars(centsToInput(1999))).toBe(1999);
});
