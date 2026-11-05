import { describe, expect, test } from 'vitest';
import {
  buildTaskList,
  evaluateService,
  evaluateVehicle,
  sortByUrgency,
} from '../../src/domain/maintenance';
import { fill, garage, record, serviceType, vehicle } from './builders';

const TODAY = '2026-11-04';

// Base oil interval for this vehicle is 5,000 miles or 6 months.
const statusOf = (lastDate: string, lastOdometer: number | undefined, odometer: number) =>
  evaluateService(
    vehicle(),
    serviceType(),
    [record({ date: lastDate, odometer: lastOdometer })],
    odometer,
    TODAY,
  ).status;

describe('status, whichever of miles or months comes first', () => {
  test.each([
    ['recent on both', '2026-10-01', 50_000, 51_000, 'ok'],
    ['past on miles only', '2026-10-01', 40_000, 50_000, 'overdue'],
    ['past on months only', '2026-01-01', 49_000, 50_000, 'overdue'],
    ['near on miles', '2026-10-01', 45_400, 50_000, 'dueSoon'],
    ['near on months', '2026-05-15', 49_000, 50_000, 'dueSoon'],
    ['exactly at the mile limit is not overdue', '2026-10-01', 45_000, 50_000, 'dueSoon'],
    ['one mile past', '2026-10-01', 44_999, 50_000, 'overdue'],
    ['overdue on one and fine on the other is overdue', '2026-10-01', 40_000, 50_000, 'overdue'],
  ])('%s', (_label, date, lastOdometer, odometer, expected) => {
    expect(statusOf(date, lastOdometer, odometer)).toBe(expected);
  });

  test('the case from the brief: last done 9 months ago, recommended every 3', () => {
    const type = serviceType({ intervalMonths: 3, intervalMiles: 3000, intervalsEdited: true });
    const item = evaluateService(
      vehicle(),
      type,
      [record({ date: '2026-02-04', odometer: 49_500 })],
      50_000,
      TODAY,
    );
    expect(item.status).toBe('overdue');
    expect(item.dueDate).toBe('2026-05-04');
  });

  test('a record with no mileage is evaluated on time only', () => {
    expect(statusOf('2026-10-01', undefined, 900_000)).toBe('ok');
    expect(statusOf('2026-01-01', undefined, 50_000)).toBe('overdue');
  });

  test('a service with only a mile interval ignores time', () => {
    const type = serviceType({ intervalMonths: null });
    const item = evaluateService(
      vehicle(),
      type,
      [record({ date: '2000-01-01', odometer: 49_000 })],
      50_000,
      TODAY,
    );
    expect(item.status).toBe('ok');
    expect(item.dueDate).toBeNull();
  });

  test('uses the latest record, and the higher odometer on the same day', () => {
    const records = [
      record({ date: '2020-01-01', odometer: 10_000 }),
      record({ date: '2026-10-01', odometer: 49_000 }),
      record({ date: '2026-10-01', odometer: 49_900 }),
      record({ date: '2026-10-01', odometer: 49_100 }),
      record({ date: '2019-01-01', odometer: 5_000 }),
    ];
    const item = evaluateService(vehicle(), serviceType(), records, 50_000, TODAY);
    expect(item.lastOdometer).toBe(49_900);
    expect(item.milesRemaining).toBe(4_900);
  });

  test('a record covering several services counts for each', () => {
    const multi = record({ serviceTypeIds: ['oil-change', 'tire-rotation'], date: '2026-10-01' });
    const tires = serviceType({ id: 'tire-rotation' });
    expect(evaluateService(vehicle(), tires, [multi], 50_000, TODAY).lastDate).toBe('2026-10-01');
  });

  test('with no history the status is noRecord, never overdue', () => {
    const item = evaluateService(vehicle(), serviceType(), [], 120_000, TODAY);
    expect(item.status).toBe('noRecord');
    expect(item.milesRemaining).toBeNull();
  });
});

describe('ordering', () => {
  test('overdue, then due soon, then no record, then ok', () => {
    const data = garage({
      vehicles: [vehicle()],
      serviceTypes: [
        serviceType({ id: 'a', name: 'A' }),
        serviceType({ id: 'b', name: 'B' }),
        serviceType({ id: 'c', name: 'C' }),
        serviceType({ id: 'd', name: 'D' }),
      ],
      serviceRecords: [
        record({ serviceTypeIds: ['a'], date: '2026-10-01', odometer: 50_000 }),
        record({ serviceTypeIds: ['b'], date: '2026-10-01', odometer: 45_400 }),
        record({ serviceTypeIds: ['d'], date: '2026-10-01', odometer: 40_000 }),
      ],
    });
    expect(evaluateVehicle(data, vehicle(), TODAY).map((item) => item.serviceType.id)).toEqual([
      'd',
      'b',
      'c',
      'a',
    ]);
  });

  test('the more overdue item comes first, comparing miles and months fairly', () => {
    const byMiles = evaluateService(
      vehicle(),
      serviceType({ id: 'miles', name: 'Miles' }),
      [record({ serviceTypeIds: ['miles'], date: '2026-10-01', odometer: 44_000 })],
      50_000,
      TODAY,
    );
    const byMonths = evaluateService(
      vehicle(),
      serviceType({ id: 'months', name: 'Months' }),
      [record({ serviceTypeIds: ['months'], date: '2024-01-01', odometer: 49_000 })],
      50_000,
      TODAY,
    );
    expect(sortByUrgency([byMiles, byMonths]).map((item) => item.serviceType.id)).toEqual([
      'months',
      'miles',
    ]);
  });

  test('items with equal urgency sort by name', () => {
    const b = evaluateService(vehicle(), serviceType({ name: 'B' }), [], 0, TODAY);
    const a = evaluateService(vehicle(), serviceType({ name: 'A' }), [], 0, TODAY);
    expect(sortByUrgency([b, a]).map((item) => item.serviceType.name)).toEqual(['A', 'B']);
  });
});

describe('buildTaskList', () => {
  test('a new high-mileage vehicle does not flood the actionable list', () => {
    const data = garage({
      vehicles: [vehicle({ enteredOdometer: 120_000 })],
      serviceTypes: [serviceType({ id: 'a' }), serviceType({ id: 'b' })],
    });
    const tasks = buildTaskList(data, TODAY);
    expect(tasks.actionable).toEqual([]);
    expect(tasks.noRecord).toHaveLength(1);
    expect(tasks.noRecord[0]?.items).toHaveLength(2);
  });

  test('combines vehicles and leaves out healthy services', () => {
    const data = garage({
      vehicles: [vehicle(), vehicle({ id: 'truck', description: 'Truck' })],
      serviceTypes: [serviceType()],
      serviceRecords: [
        record({ date: '2026-10-01', odometer: 49_900 }),
        record({ vehicleId: 'truck', date: '2025-01-01', odometer: 40_000 }),
      ],
    });
    const tasks = buildTaskList(data, TODAY);
    expect(tasks.actionable.map((item) => item.vehicle.id)).toEqual(['truck']);
    expect(tasks.noRecord).toEqual([]);
  });

  test('a fill-up alone can make a service due, using the derived odometer', () => {
    const data = garage({
      vehicles: [vehicle()],
      serviceTypes: [serviceType()],
      serviceRecords: [record({ date: '2026-10-01', odometer: 50_000 })],
      fuelFillUps: [fill({ odometer: 56_000 })],
    });
    expect(buildTaskList(data, TODAY).actionable).toHaveLength(1);
  });

  test('logging the service clears the task', () => {
    const data = garage({
      vehicles: [vehicle()],
      serviceTypes: [serviceType()],
      serviceRecords: [record({ date: '2025-01-01', odometer: 40_000 })],
    });
    expect(buildTaskList(data, TODAY).actionable).toHaveLength(1);
    data.serviceRecords.push(record({ date: TODAY, odometer: 50_000 }));
    expect(buildTaskList(data, TODAY).actionable).toHaveLength(0);
  });

  test('EVs are never told to change their oil', () => {
    const ev = vehicle({ powertrain: 'electric' });
    const data = garage({ vehicles: [ev], serviceTypes: [serviceType()] });
    expect(buildTaskList(data, TODAY)).toEqual({ actionable: [], noRecord: [] });
  });
});
