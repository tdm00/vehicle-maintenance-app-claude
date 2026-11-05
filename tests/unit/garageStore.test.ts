import { describe, expect, test, vi } from 'vitest';
import type { Vehicle } from '../../src/domain/schemas';
import { createGarageStore, syncAcrossTabs } from '../../src/store/garageStore';
import { newId } from '../../src/store/ids';
import {
  createStorage,
  emptyGarage,
  type GarageStorage,
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

describe('vehicles', () => {
  test('adding persists to storage', () => {
    const store = fresh();
    const id = store.getState().addVehicle(newVehicle());
    expect(
      fresh()
        .getState()
        .data.vehicles.map((v) => v.id),
    ).toEqual([id]);
  });

  test('updating replaces by id', () => {
    const store = fresh();
    const id = store.getState().addVehicle(newVehicle());
    store.getState().updateVehicle({ ...newVehicle(), id, description: 'Renamed' });
    expect(store.getState().data.vehicles).toHaveLength(1);
    expect(store.getState().data.vehicles[0]?.description).toBe('Renamed');
  });

  test('deleting cascades to its records and leaves other vehicles alone', () => {
    const store = fresh();
    const { addVehicle, saveServiceRecord, saveFuelFillUp, deleteVehicle } = store.getState();
    const keep = addVehicle(newVehicle());
    const remove = addVehicle(newVehicle());
    saveServiceRecord({ ...record({ vehicleId: keep }), id: undefined });
    saveServiceRecord({ ...record({ vehicleId: remove }), id: undefined });
    saveFuelFillUp({ ...fill({ vehicleId: keep }), id: undefined });
    saveFuelFillUp({ ...fill({ vehicleId: remove }), id: undefined });
    deleteVehicle(remove);
    const { data } = store.getState();
    expect(data.vehicles.map((v) => v.id)).toEqual([keep]);
    expect(data.serviceRecords.map((r) => r.vehicleId)).toEqual([keep]);
    expect(data.fuelFillUps.map((f) => f.vehicleId)).toEqual([keep]);
  });

  test('a service can be marked not applicable and restored', () => {
    const store = fresh();
    const keep = store.getState().addVehicle(newVehicle());
    const other = store.getState().addVehicle(newVehicle());
    store.getState().setServiceIgnored(keep, 'oil-change', true);
    store.getState().setServiceIgnored(keep, 'oil-change', true);
    const find = (id: string) => store.getState().data.vehicles.find((v) => v.id === id);
    expect(find(keep)?.ignoredServiceTypeIds).toEqual(['oil-change']);
    expect(find(other)?.ignoredServiceTypeIds).toEqual([]);
    store.getState().setServiceIgnored(keep, 'oil-change', false);
    expect(find(keep)?.ignoredServiceTypeIds).toEqual([]);
  });
});

describe('records', () => {
  test('saving without an id adds; with an id replaces; delete removes', () => {
    const store = fresh();
    store.getState().saveServiceRecord({ ...record(), id: undefined, notes: 'one' });
    const saved = store.getState().data.serviceRecords[0];
    if (!saved) throw new Error('not saved');
    store.getState().saveServiceRecord({ ...saved, notes: 'two' });
    expect(store.getState().data.serviceRecords.map((r) => r.notes)).toEqual(['two']);
    store.getState().deleteServiceRecord(saved.id);
    expect(store.getState().data.serviceRecords).toEqual([]);
  });

  test('fill-ups work the same way', () => {
    const store = fresh();
    store.getState().saveFuelFillUp({ ...fill(), id: undefined, gallons: 5 });
    const saved = store.getState().data.fuelFillUps[0];
    if (!saved) throw new Error('not saved');
    store.getState().saveFuelFillUp({ ...saved, gallons: 6 });
    expect(store.getState().data.fuelFillUps.map((f) => f.gallons)).toEqual([6]);
    store.getState().deleteFuelFillUp(saved.id);
    expect(store.getState().data.fuelFillUps).toEqual([]);
  });

  test('custom service types can be added and existing ones edited', () => {
    const store = fresh();
    const before = store.getState().data.serviceTypes.length;
    store.getState().saveServiceType({
      name: 'Detail',
      intervalMiles: null,
      intervalMonths: 6,
      powertrains: ['gas'],
      isCustom: true,
      isHidden: false,
      intervalsEdited: false,
    });
    expect(store.getState().data.serviceTypes).toHaveLength(before + 1);
    const oil = store.getState().data.serviceTypes.find((t) => t.id === 'oil-change');
    if (!oil) throw new Error('missing');
    store.getState().saveServiceType({ ...oil, isHidden: true });
    expect(store.getState().data.serviceTypes.find((t) => t.id === 'oil-change')?.isHidden).toBe(
      true,
    );
  });
});

describe('insurance', () => {
  const newPolicy = (vehicleIds: string[]) => ({ ...policy({ vehicleIds }), id: undefined });

  test('saving adds and then replaces; delete removes', () => {
    const store = fresh();
    store.getState().saveInsurancePolicy(newPolicy(['a']));
    const saved = store.getState().data.insurancePolicies[0];
    if (!saved) throw new Error('not saved');
    store.getState().saveInsurancePolicy({ ...saved, company: 'Renamed' });
    expect(
      fresh()
        .getState()
        .data.insurancePolicies.map((p) => p.company),
    ).toEqual(['Renamed']);
    store.getState().deleteInsurancePolicy(saved.id);
    expect(store.getState().data.insurancePolicies).toEqual([]);
  });

  test('deleting a vehicle removes it from shared policies, and keeps the policy', () => {
    const store = fresh();
    const first = store.getState().addVehicle(newVehicle());
    const second = store.getState().addVehicle(newVehicle());
    store.getState().saveInsurancePolicy(newPolicy([first, second]));
    store.getState().deleteVehicle(first);
    expect(store.getState().data.insurancePolicies[0]?.vehicleIds).toEqual([second]);
    store.getState().deleteVehicle(second);
    expect(store.getState().data.insurancePolicies[0]?.vehicleIds).toEqual([]);
  });

  test('editing a vehicle leaves its policies alone', () => {
    const store = fresh();
    const id = store.getState().addVehicle(newVehicle());
    store.getState().saveInsurancePolicy(newPolicy([id]));
    store.getState().updateVehicle({ ...newVehicle(), id, description: 'Renamed' });
    expect(store.getState().data.insurancePolicies[0]?.vehicleIds).toEqual([id]);
  });
});

describe('failure modes', () => {
  test('corrupt data blocks writes and is never overwritten', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    const store = fresh();
    expect(store.getState().status).toBe('corrupt');
    store.getState().addVehicle(newVehicle());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{bad');
    expect(localStorage.getItem(QUARANTINE_KEY)).toBe('{bad');
    expect(store.getState().rawSaved()).toBe('{bad');
  });

  test('newer data blocks writes and is never overwritten', () => {
    const saved = serialize(emptyGarage(), 99);
    localStorage.setItem(STORAGE_KEY, saved);
    const store = fresh();
    expect(store.getState().status).toBe('newer');
    store.getState().replaceData(emptyGarage());
    expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
  });

  test('starting over after corruption keeps the quarantined copy', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    const store = fresh();
    store.getState().discardSaved();
    expect(store.getState().status).toBe('ready');
    expect(localStorage.getItem(QUARANTINE_KEY)).toBe('{bad');
    store.getState().addVehicle(newVehicle());
    expect(fresh().getState().data.vehicles).toHaveLength(1);
  });

  test('a failed discard leaves the block in place', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    const storage = createStorage(localStorage);
    const store = createGarageStore({ ...storage, discard: () => false });
    store.getState().discardSaved();
    expect(store.getState().status).toBe('corrupt');
  });

  test('a write failure warns, keeps the data in memory, and clears on the next success', () => {
    const storage: GarageStorage = { ...createStorage(localStorage), save: () => false };
    const failing = createGarageStore(storage);
    failing.getState().addVehicle(newVehicle());
    expect(failing.getState().warning).toBe('writeFailed');
    expect(failing.getState().data.vehicles).toHaveLength(1);

    let ok = false;
    const flaky = createGarageStore({ ...createStorage(localStorage), save: () => ok });
    flaky.getState().addVehicle(newVehicle());
    expect(flaky.getState().warning).toBe('writeFailed');
    ok = true;
    flaky.getState().addVehicle(newVehicle());
    expect(flaky.getState().warning).toBeNull();
  });

  test('unavailable storage runs in memory with a lasting warning', () => {
    const store = createGarageStore(createStorage(null));
    expect(store.getState().warning).toBe('unavailable');
    store.getState().addVehicle(newVehicle());
    expect(store.getState().data.vehicles).toHaveLength(1);
    expect(store.getState().warning).toBe('unavailable');
  });
});

describe('backup', () => {
  test('import replaces everything and persists', () => {
    const store = fresh();
    store.getState().addVehicle(newVehicle());
    store.getState().replaceData(emptyGarage());
    expect(fresh().getState().data.vehicles).toEqual([]);
  });

  test('records the backup date', () => {
    const store = fresh();
    store.getState().markBackedUp('2026-11-04');
    expect(fresh().getState().data.settings.lastBackupAt).toBe('2026-11-04');
  });
});

describe('syncAcrossTabs', () => {
  test('reloads on a change to our key, and stops after cleanup', () => {
    const store = fresh();
    const stop = syncAcrossTabs(store);
    fresh().getState().addVehicle(newVehicle());
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    expect(store.getState().data.vehicles).toHaveLength(0);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(store.getState().data.vehicles).toHaveLength(1);

    stop();
    const spy = vi.spyOn(store.getState(), 'reload');
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(spy).not.toHaveBeenCalled();
  });

  test('a cleared store reloads too', () => {
    const store = fresh();
    store.getState().addVehicle(newVehicle());
    syncAcrossTabs(store)();
    const stop = syncAcrossTabs(store);
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(store.getState().data.vehicles).toEqual([]);
    stop();
  });
});

test('ids are unique and do not need a secure context', () => {
  vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
  expect(newId()).toMatch(/^[0-9a-f]{32}$/);
  expect(newId()).not.toBe(newId());
  vi.unstubAllGlobals();
});
