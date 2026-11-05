import { DEFAULT_SERVICE_TYPES } from '../data/serviceCatalog';
import { type GarageData, garageDataSchema } from '../domain/schemas';

export const STORAGE_KEY = 'garage.data';
export const QUARANTINE_KEY = 'garage.quarantine';
const QUARANTINE_KEYS = [QUARANTINE_KEY, `${QUARANTINE_KEY}.2`, `${QUARANTINE_KEY}.3`];
export const SCHEMA_VERSION = 2;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** Each entry upgrades data from that version to the next. */
export type Migrations = Record<number, (data: unknown) => unknown>;
export const MIGRATIONS: Migrations = {
  1: (data) => ({ ...(data as object), insurancePolicies: [] }),
};

export type StorageBacking = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type ParseResult =
  | { kind: 'ok'; data: GarageData }
  | { kind: 'corrupt'; reason: string }
  | { kind: 'newer'; version: number };

export type LoadResult = ParseResult | { kind: 'empty' } | { kind: 'unavailable' };

export function emptyGarage(): GarageData {
  return {
    vehicles: [],
    serviceRecords: [],
    fuelFillUps: [],
    serviceTypes: structuredClone(DEFAULT_SERVICE_TYPES),
    insurancePolicies: [],
    settings: { lastBackupAt: null },
  };
}

/** Parses saved text, from storage or a backup file, which is always treated as untrusted. */
export function parseSaved(
  text: string,
  version = SCHEMA_VERSION,
  migrations = MIGRATIONS,
): ParseResult {
  let envelope: unknown;
  try {
    envelope = JSON.parse(text);
  } catch {
    return { kind: 'corrupt', reason: 'The file is not valid JSON.' };
  }

  if (typeof envelope !== 'object' || envelope === null) {
    return { kind: 'corrupt', reason: 'The file is not a Garage backup.' };
  }
  const { schemaVersion, data } = envelope as { schemaVersion?: unknown; data?: unknown };
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    return { kind: 'corrupt', reason: 'The file is not a Garage backup.' };
  }
  if (schemaVersion > version) return { kind: 'newer', version: schemaVersion };

  let current = data;
  try {
    for (let from = schemaVersion; from < version; from++) {
      const migrate = migrations[from];
      if (!migrate) return { kind: 'corrupt', reason: `No upgrade from version ${from}.` };
      current = migrate(current);
    }
  } catch {
    return { kind: 'corrupt', reason: 'The data could not be upgraded.' };
  }

  const parsed = garageDataSchema.safeParse(current);
  if (!parsed.success) {
    return { kind: 'corrupt', reason: 'The data is damaged or incomplete.' };
  }
  return { kind: 'ok', data: parsed.data };
}

export function serialize(data: GarageData, version = SCHEMA_VERSION): string {
  return JSON.stringify({ schemaVersion: version, data });
}

function hasDuplicates(items: { id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size !== items.length;
}

/**
 * Checks a backup hangs together. This runs on import only: data already in the browser must keep
 * loading even if imperfect. Ids that break edits or can't belong to anything are refused, while
 * ghost vehicles on a policy are dropped, because older versions could save them.
 */
function reconcileImport(data: GarageData): GarageData | null {
  const vehicleIds = new Set(data.vehicles.map((vehicle) => vehicle.id));
  const orphaned = [...data.serviceRecords, ...data.fuelFillUps].some(
    (entry) => !vehicleIds.has(entry.vehicleId),
  );
  const duplicated = [
    data.vehicles,
    data.serviceRecords,
    data.fuelFillUps,
    data.serviceTypes,
    data.insurancePolicies,
  ].some(hasDuplicates);
  if (orphaned || duplicated) return null;

  return {
    ...data,
    insurancePolicies: data.insurancePolicies.map((policy) => ({
      ...policy,
      vehicleIds: policy.vehicleIds.filter((id) => vehicleIds.has(id)),
    })),
  };
}

export function parseImport(text: string): ParseResult {
  if (new Blob([text]).size > MAX_IMPORT_BYTES) {
    return { kind: 'corrupt', reason: 'The file is larger than the 5 MB limit.' };
  }
  const result = parseSaved(text);
  if (result.kind !== 'ok') return result;
  const data = reconcileImport(result.data);
  return data
    ? { kind: 'ok', data }
    : { kind: 'corrupt', reason: 'The file has duplicate or orphaned entries.' };
}

/** Returns usable localStorage, or null when the browser blocks it. */
export function browserBacking(): StorageBacking | null {
  try {
    const probe = 'garage.probe';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface GarageStorage {
  load(): LoadResult;
  save(data: GarageData): boolean;
  /** The saved text as it stands, for offering a recovery download. */
  raw(): string | null;
  /** Removes primary data, keeping the quarantined copy. */
  discard(): boolean;
  /** Damaged saves kept for recovery, newest first. */
  quarantined(): string[];
}

function readQuarantine(backing: StorageBacking | null): string[] {
  try {
    return QUARANTINE_KEYS.flatMap((key) => backing?.getItem(key) ?? []);
  } catch {
    return [];
  }
}

function quarantine(backing: StorageBacking, text: string) {
  const kept = readQuarantine(backing);
  if (kept.includes(text)) return;
  try {
    [text, ...kept].slice(0, QUARANTINE_KEYS.length).forEach((copy, index) => {
      backing.setItem(QUARANTINE_KEYS[index] as string, copy);
    });
  } catch {
    // The primary copy is untouched, so nothing is lost if this fails.
  }
}

export function createStorage(backing: StorageBacking | null): GarageStorage {
  return {
    load() {
      if (!backing) return { kind: 'unavailable' };
      let text: string | null;
      try {
        text = backing.getItem(STORAGE_KEY);
      } catch {
        return { kind: 'unavailable' };
      }
      if (text === null) return { kind: 'empty' };

      const result = parseSaved(text);
      if (result.kind === 'corrupt') quarantine(backing, text);
      return result;
    },
    save(data) {
      if (!backing) return false;
      try {
        backing.setItem(STORAGE_KEY, serialize(data));
        return true;
      } catch {
        return false;
      }
    },
    raw() {
      try {
        return backing?.getItem(STORAGE_KEY) ?? null;
      } catch {
        return null;
      }
    },
    quarantined: () => readQuarantine(backing),
    discard() {
      try {
        backing?.removeItem(STORAGE_KEY);
        return true;
      } catch {
        return false;
      }
    },
  };
}
