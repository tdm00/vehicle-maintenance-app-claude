import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type {
  FuelFillUp,
  GarageData,
  InsurancePolicy,
  ServiceRecord,
  ServiceType,
  Vehicle,
} from '../domain/schemas';
import { newId } from './ids';
import {
  browserBacking,
  createStorage,
  emptyGarage,
  type GarageStorage,
  STORAGE_KEY,
} from './storage';

/** `corrupt` and `newer` block every write so the saved data can't be overwritten. */
export type LoadStatus = 'ready' | 'corrupt' | 'newer';
export type StorageWarning = 'unavailable' | 'writeFailed' | null;

type New<T> = Omit<T, 'id'>;

export interface GarageState {
  data: GarageData;
  status: LoadStatus;
  warning: StorageWarning;
  reload(): void;
  addVehicle(vehicle: New<Vehicle>): string;
  updateVehicle(vehicle: Vehicle): void;
  deleteVehicle(id: string): void;
  setServiceIgnored(vehicleId: string, serviceTypeId: string, ignored: boolean): void;
  saveServiceRecord(record: New<ServiceRecord> & { id?: string }): void;
  deleteServiceRecord(id: string): void;
  saveFuelFillUp(fillUp: New<FuelFillUp> & { id?: string }): void;
  deleteFuelFillUp(id: string): void;
  saveServiceType(type: New<ServiceType> & { id?: string }): void;
  saveInsurancePolicy(policy: New<InsurancePolicy> & { id?: string }): void;
  deleteInsurancePolicy(id: string): void;
  replaceData(data: GarageData): void;
  markBackedUp(date: string): void;
  discardSaved(): void;
  deleteAll(): void;
  rawSaved(): string | null;
  quarantined(): string[];
}

function upsert<T extends { id: string }>(items: T[], item: New<T> & { id?: string }): T[] {
  if (item.id) {
    return items.map((existing) => (existing.id === item.id ? (item as T) : existing));
  }
  return [...items, { ...item, id: newId() } as T];
}

function initialState(storage: GarageStorage) {
  const result = storage.load();
  switch (result.kind) {
    case 'ok':
      return { data: result.data, status: 'ready' as const, warning: null };
    case 'empty':
      return { data: emptyGarage(), status: 'ready' as const, warning: null };
    case 'unavailable':
      return { data: emptyGarage(), status: 'ready' as const, warning: 'unavailable' as const };
    case 'corrupt':
      return { data: emptyGarage(), status: 'corrupt' as const, warning: null };
    case 'newer':
      return { data: emptyGarage(), status: 'newer' as const, warning: null };
  }
}

export function createGarageStore(storage: GarageStorage): StoreApi<GarageState> {
  return createStore<GarageState>((set, get) => {
    /**
     * Applies a change on top of what's saved now, not this tab's copy, which is stale if it
     * missed another tab's update. A save only happens over data that was read successfully.
     */
    function commit(change: (data: GarageData) => GarageData) {
      if (get().status !== 'ready') return;
      const { data: current, warning } = get();

      const latest = storage.load();
      if (latest.kind === 'corrupt' || latest.kind === 'newer') {
        set(initialState(storage));
        return;
      }
      if (latest.kind === 'unavailable') {
        set({ data: change(current), warning: 'unavailable' });
        return;
      }

      // A failed save leaves this tab ahead of storage, so keep its copy to retry.
      const base = latest.kind === 'ok' && warning !== 'writeFailed' ? latest.data : current;
      const data = change(base);
      set({ data, warning: storage.save(data) ? null : 'writeFailed' });
    }

    return {
      ...initialState(storage),

      reload: () => set(initialState(storage)),

      addVehicle(vehicle) {
        const id = newId();
        commit((data) => ({ ...data, vehicles: [...data.vehicles, { ...vehicle, id }] }));
        return id;
      },

      updateVehicle(vehicle) {
        commit((data) => ({ ...data, vehicles: upsert(data.vehicles, vehicle) }));
      },

      deleteVehicle(id) {
        commit((data) => ({
          ...data,
          vehicles: data.vehicles.filter((vehicle) => vehicle.id !== id),
          serviceRecords: data.serviceRecords.filter((record) => record.vehicleId !== id),
          fuelFillUps: data.fuelFillUps.filter((fillUp) => fillUp.vehicleId !== id),
          insurancePolicies: data.insurancePolicies.map((policy) => ({
            ...policy,
            vehicleIds: policy.vehicleIds.filter((vehicleId) => vehicleId !== id),
          })),
        }));
      },

      setServiceIgnored(vehicleId, serviceTypeId, ignored) {
        commit((data) => ({
          ...data,
          vehicles: data.vehicles.map((vehicle) => {
            if (vehicle.id !== vehicleId) return vehicle;
            const others = vehicle.ignoredServiceTypeIds.filter((id) => id !== serviceTypeId);
            return {
              ...vehicle,
              ignoredServiceTypeIds: ignored ? [...others, serviceTypeId] : others,
            };
          }),
        }));
      },

      saveServiceRecord(record) {
        commit((data) => ({ ...data, serviceRecords: upsert(data.serviceRecords, record) }));
      },

      deleteServiceRecord(id) {
        commit((data) => ({
          ...data,
          serviceRecords: data.serviceRecords.filter((record) => record.id !== id),
        }));
      },

      saveFuelFillUp(fillUp) {
        commit((data) => ({ ...data, fuelFillUps: upsert(data.fuelFillUps, fillUp) }));
      },

      deleteFuelFillUp(id) {
        commit((data) => ({
          ...data,
          fuelFillUps: data.fuelFillUps.filter((fillUp) => fillUp.id !== id),
        }));
      },

      saveServiceType(type) {
        commit((data) => ({ ...data, serviceTypes: upsert(data.serviceTypes, type) }));
      },

      saveInsurancePolicy(policy) {
        commit((data) => ({
          ...data,
          insurancePolicies: upsert(data.insurancePolicies, policy),
        }));
      },

      deleteInsurancePolicy(id) {
        commit((data) => ({
          ...data,
          insurancePolicies: data.insurancePolicies.filter((policy) => policy.id !== id),
        }));
      },

      replaceData(data) {
        commit(() => data);
      },

      markBackedUp(date) {
        commit((data) => ({ ...data, settings: { ...data.settings, lastBackupAt: date } }));
      },

      discardSaved() {
        if (!storage.discard()) return;
        set({ data: emptyGarage(), status: 'ready', warning: null });
      },

      deleteAll() {
        if (!storage.deleteAll()) return;
        set({ data: emptyGarage(), status: 'ready', warning: null });
      },

      rawSaved: () => storage.raw(),
      quarantined: () => storage.quarantined(),
    };
  });
}

export const garageStore = createGarageStore(createStorage(browserBacking()));

/** Keeps other open tabs current, so a stale tab can't overwrite newer data. */
export function syncAcrossTabs(store: StoreApi<GarageState> = garageStore): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) store.getState().reload();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

export function useGarage<T>(selector: (state: GarageState) => T): T {
  return useStore(garageStore, selector);
}
