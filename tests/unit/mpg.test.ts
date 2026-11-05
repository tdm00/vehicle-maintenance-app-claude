import { describe, expect, test } from 'vitest';
import { computeFuelStats, pricePerGallonCents } from '../../src/domain/mpg';
import { fill } from './builders';

const mpgs = (fills: Parameters<typeof computeFuelStats>[0]) =>
  computeFuelStats(fills)
    .entries.map((entry) => entry.mpg)
    .reverse();

describe('per-fill MPG', () => {
  test('no fill-ups', () => {
    const stats = computeFuelStats([]);
    expect(stats.entries).toEqual([]);
    expect(stats.overallMpg).toBeNull();
    expect(stats.totalCostCents).toBe(0);
  });

  test('the first fill has no MPG', () => {
    expect(mpgs([fill()])).toEqual([null]);
    expect(computeFuelStats([fill()]).overallMpg).toBeNull();
  });

  test('miles since the last fill divided by gallons', () => {
    expect(mpgs([fill({ odometer: 1000 }), fill({ odometer: 1300, gallons: 10 })])).toEqual([
      null,
      30,
    ]);
  });

  test('entries are sorted by odometer however they were logged', () => {
    const fills = [
      fill({ odometer: 1600, gallons: 10 }),
      fill({ odometer: 1000 }),
      fill({ odometer: 1300, gallons: 15 }),
    ];
    expect(mpgs(fills)).toEqual([null, 20, 30]);
  });

  test('the same odometer on two entries gives no MPG, not infinity', () => {
    expect(mpgs([fill({ odometer: 1000 }), fill({ odometer: 1000 })])).toEqual([null, null]);
  });

  test('editing a fill-up changes the result, because nothing is stored', () => {
    const first = fill({ odometer: 1000 });
    const second = fill({ odometer: 1300 });
    expect(mpgs([first, second])[1]).toBe(30);
    expect(mpgs([first, { ...second, odometer: 1200 }])[1]).toBe(20);
  });
});

describe('partial fills', () => {
  test('partial gallons roll into the next full fill', () => {
    const fills = [
      fill({ odometer: 1000 }),
      fill({ odometer: 1200, gallons: 4, isFull: false }),
      fill({ odometer: 1400, gallons: 6 }),
    ];
    expect(mpgs(fills)).toEqual([null, null, 40]);
    expect(computeFuelStats(fills).overallMpg).toBe(40);
  });

  test('partial fills before the first full fill are not measured', () => {
    const fills = [
      fill({ odometer: 900, gallons: 5, isFull: false }),
      fill({ odometer: 1000 }),
      fill({ odometer: 1300 }),
    ];
    expect(mpgs(fills)).toEqual([null, null, 30]);
    expect(computeFuelStats(fills).overallMpg).toBe(30);
  });

  test('a trailing partial fill does not lower overall MPG', () => {
    const fills = [
      fill({ odometer: 1000 }),
      fill({ odometer: 1300 }),
      fill({ odometer: 1400, gallons: 8, isFull: false }),
    ];
    expect(computeFuelStats(fills).overallMpg).toBe(30);
  });

  test('only partial fills cannot be measured', () => {
    const fills = [fill({ isFull: false }), fill({ odometer: 1200, isFull: false })];
    expect(computeFuelStats(fills).overallMpg).toBeNull();
  });
});

describe('overall MPG', () => {
  test('excludes the first tank', () => {
    const fills = [
      fill({ odometer: 1000, gallons: 99 }),
      fill({ odometer: 1300, gallons: 10 }),
      fill({ odometer: 1500, gallons: 10 }),
    ];
    // 500 miles on 20 gallons. Including the first tank would give about 4.2.
    expect(computeFuelStats(fills).overallMpg).toBe(25);
  });

  test('is distance over fuel, not an average of each fill', () => {
    const fills = [
      fill({ odometer: 1000 }),
      fill({ odometer: 1100, gallons: 10 }), // 10 MPG
      fill({ odometer: 1400, gallons: 10 }), // 30 MPG
      fill({ odometer: 2000, gallons: 20 }), // 30 MPG
    ];
    expect(computeFuelStats(fills).overallMpg).toBe(25);
  });
});

test('totals include every fill', () => {
  const stats = computeFuelStats([
    fill({ gallons: 10, costCents: 3000 }),
    fill({ odometer: 1200, gallons: 5.5, costCents: 1650 }),
  ]);
  expect(stats.totalCostCents).toBe(4650);
  expect(stats.totalGallons).toBe(15.5);
});

test('price per gallon', () => {
  expect(pricePerGallonCents({ costCents: 4550, gallons: 13 })).toBe(350);
});
