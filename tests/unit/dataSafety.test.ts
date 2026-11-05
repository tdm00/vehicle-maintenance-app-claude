import { describe, expect, test } from 'vitest';
import type { Vehicle } from '../../src/domain/schemas';
import { createGarageStore } from '../../src/store/garageStore';
import {
  createStorage,
  emptyGarage,
  type GarageStorage,
  parseImport,
  QUARANTINE_KEY,
  STORAGE_KEY,
  serialize,
} from '../../src/store/storage';
import { fill, policy, record, vehicle } from './builders';

const newVehicle = (): Omit<Vehicle, 'id'> => {
  const { id: _id, ...rest } = vehicle();
  return rest;
};
const fresh = () => createGarageStore(createStorage(localStorage));

describe('a tab that missed an update', () => {
  test('keeps the other tab’s work when it saves', () => {
    const stale = fresh();
    const other = fresh();
    const id = other.getState().addVehicle(newVehicle());
    stale.getState().addVehicle({ ...newVehicle(), description: 'From stale tab' });

    const saved = fresh().getState().data.vehicles;
    expect(saved).toHaveLength(2);
    expect(saved.map((v) => v.id)).toContain(id);
    expect(stale.getState().data.vehicles).toHaveLength(2);
  });

  test('stops writing if another tab saved a newer format', () => {
    const stale = fresh();
    const newer = serialize(emptyGarage(), 99);
    localStorage.setItem(STORAGE_KEY, newer);
    stale.getState().addVehicle(newVehicle());
    expect(localStorage.getItem(STORAGE_KEY)).toBe(newer);
    expect(stale.getState().status).toBe('newer');
  });

  test('stops writing if the saved data became damaged', () => {
    const stale = fresh();
    localStorage.setItem(STORAGE_KEY, '{bad');
    stale.getState().addVehicle(newVehicle());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{bad');
    expect(stale.getState().status).toBe('corrupt');
  });
});

describe('a failed read', () => {
  function flakyRead(): { storage: GarageStorage; recover: () => void } {
    const real = createStorage(localStorage);
    let failing = true;
    return {
      storage: {
        ...real,
        load: () => (failing ? { kind: 'unavailable' } : real.load()),
      },
      recover: () => {
        failing = false;
      },
    };
  }

  test('never overwrites data it could not read', () => {
    const saved = serialize({ ...emptyGarage(), vehicles: [vehicle()] });
    localStorage.setItem(STORAGE_KEY, saved);
    const store = createGarageStore(flakyRead().storage);
    store.getState().addVehicle(newVehicle());
    expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
    expect(store.getState().warning).toBe('unavailable');
  });

  test('picks the real data back up once reads recover', () => {
    localStorage.setItem(STORAGE_KEY, serialize({ ...emptyGarage(), vehicles: [vehicle()] }));
    const { storage, recover } = flakyRead();
    const store = createGarageStore(storage);
    recover();
    store.getState().addVehicle(newVehicle());
    expect(fresh().getState().data.vehicles).toHaveLength(2);
  });
});

test('changes that failed to save are kept for the next attempt', () => {
  let ok = false;
  const real = createStorage(localStorage);
  const store = createGarageStore({
    ...real,
    save: (data) => ok && real.save(data),
  });
  store.getState().addVehicle(newVehicle());
  ok = true;
  store.getState().addVehicle(newVehicle());
  expect(fresh().getState().data.vehicles).toHaveLength(2);
});

describe('restoring a file', () => {
  const importing = (changes: Partial<ReturnType<typeof emptyGarage>>) =>
    parseImport(serialize({ ...emptyGarage(), vehicles: [vehicle()], ...changes }));

  test('accepts a consistent backup', () => {
    expect(
      importing({
        serviceRecords: [record()],
        fuelFillUps: [fill()],
        insurancePolicies: [policy()],
      }).kind,
    ).toBe('ok');
  });

  test.each([
    ['duplicate vehicles', { vehicles: [vehicle(), vehicle()] }],
    ['duplicate records', { serviceRecords: [record({ id: 'r' }), record({ id: 'r' })] }],
    ['duplicate fill-ups', { fuelFillUps: [fill({ id: 'f' }), fill({ id: 'f' })] }],
    ['duplicate policies', { insurancePolicies: [policy(), policy()] }],
    ['a record for no vehicle', { serviceRecords: [record({ vehicleId: 'nobody' })] }],
    ['a fill-up for no vehicle', { fuelFillUps: [fill({ vehicleId: 'nobody' })] }],
  ])('rejects %s', (_label, changes) => {
    expect(importing(changes)).toEqual({
      kind: 'corrupt',
      reason: 'The file has duplicate or orphaned entries.',
    });
  });

  test('drops unknown vehicles from a policy, because the app itself could have saved them', () => {
    const result = importing({ insurancePolicies: [policy({ vehicleIds: ['car', 'ghost'] })] });
    if (result.kind !== 'ok') throw new Error(result.kind);
    expect(result.data.insurancePolicies[0]?.vehicleIds).toEqual(['car']);
  });

  test('keeps a record naming a removed service, which the app displays', () => {
    expect(importing({ serviceRecords: [record({ serviceTypeIds: ['gone'] })] }).kind).toBe('ok');
  });
});

describe('quarantined copies', () => {
  const load = (text: string) => {
    localStorage.setItem(STORAGE_KEY, text);
    return createStorage(localStorage).load();
  };

  test('a second corruption keeps the first copy', () => {
    load('{first');
    load('{second');
    expect(createStorage(localStorage).quarantined()).toEqual(['{second', '{first']);
    expect(localStorage.getItem(QUARANTINE_KEY)).toBe('{second');
  });

  test('reloading the same damage does not use up the slots', () => {
    load('{first');
    load('{first');
    expect(createStorage(localStorage).quarantined()).toEqual(['{first']);
  });

  test('keeps the three newest', () => {
    for (const text of ['{1', '{2', '{3', '{4']) load(text);
    expect(createStorage(localStorage).quarantined()).toEqual(['{4', '{3', '{2']);
  });

  test('is empty with no storage', () => {
    expect(createStorage(null).quarantined()).toEqual([]);
  });
});
