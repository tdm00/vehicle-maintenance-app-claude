import { describe, expect, test, vi } from 'vitest';
import {
  browserBacking,
  createStorage,
  emptyGarage,
  MAX_IMPORT_BYTES,
  parseImport,
  parseSaved,
  QUARANTINE_KEY,
  SCHEMA_VERSION,
  STORAGE_KEY,
  type StorageBacking,
  serialize,
} from '../../src/store/storage';
import { vehicle } from './builders';

function memoryBacking(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const backing: StorageBacking = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
  return { backing, items };
}

describe('parseSaved', () => {
  test('round-trips', () => {
    const data = { ...emptyGarage(), vehicles: [vehicle()] };
    expect(parseSaved(serialize(data))).toEqual({ kind: 'ok', data });
  });

  test.each([
    ['not JSON', '{oops'],
    ['a bare value', '42'],
    ['null', 'null'],
    ['no version', '{"data":{}}'],
    ['a text version', '{"schemaVersion":"1","data":{}}'],
    ['version zero', '{"schemaVersion":0,"data":{}}'],
    ['the wrong shape', '{"schemaVersion":1,"data":{"vehicles":"x"}}'],
    [
      'a record failing validation',
      `{"schemaVersion":1,"data":${JSON.stringify({ ...emptyGarage(), vehicles: [{ ...vehicle(), color: 'red' }] })}}`,
    ],
  ])('reports %s as corrupt', (_label, text) => {
    expect(parseSaved(text).kind).toBe('corrupt');
  });

  test('reports data from a newer app', () => {
    const text = serialize(emptyGarage(), SCHEMA_VERSION + 1);
    expect(parseSaved(text)).toEqual({ kind: 'newer', version: SCHEMA_VERSION + 1 });
  });
});

describe('migrations', () => {
  const garage = emptyGarage();

  test('run in sequence up to the current version', () => {
    const legacy = JSON.stringify({ schemaVersion: 1, data: { step: 1 } });
    const migrations = {
      1: (data: unknown) => ({ ...(data as object), step: 2 }),
      2: (data: unknown) => ((data as { step: number }).step === 2 ? garage : null),
    };
    expect(parseSaved(legacy, 3, migrations)).toEqual({ kind: 'ok', data: garage });
  });

  test('a missing step is corrupt, not silently skipped', () => {
    expect(parseSaved(serialize(garage, 1), 2, {}).kind).toBe('corrupt');
  });

  test('a throwing step is corrupt', () => {
    const migrations = {
      1: () => {
        throw new Error('boom');
      },
    };
    expect(parseSaved(serialize(garage, 1), 2, migrations).kind).toBe('corrupt');
  });
});

test('parseImport rejects oversized files', () => {
  const result = parseImport(`"${'x'.repeat(MAX_IMPORT_BYTES)}"`);
  expect(result).toEqual({ kind: 'corrupt', reason: 'The file is larger than the 5 MB limit.' });
});

describe('createStorage', () => {
  test('empty when nothing is saved', () => {
    expect(createStorage(memoryBacking().backing).load()).toEqual({ kind: 'empty' });
  });

  test('saves and loads', () => {
    const storage = createStorage(memoryBacking().backing);
    const data = emptyGarage();
    expect(storage.save(data)).toBe(true);
    expect(storage.load()).toEqual({ kind: 'ok', data });
  });

  test('corrupt data is quarantined and left in place', () => {
    const { backing, items } = memoryBacking({ [STORAGE_KEY]: '{bad' });
    expect(createStorage(backing).load().kind).toBe('corrupt');
    expect(items.get(STORAGE_KEY)).toBe('{bad');
    expect(items.get(QUARANTINE_KEY)).toBe('{bad');
  });

  test('a failed quarantine still reports corrupt', () => {
    const { backing } = memoryBacking({ [STORAGE_KEY]: '{bad' });
    backing.setItem = () => {
      throw new Error('full');
    };
    expect(createStorage(backing).load().kind).toBe('corrupt');
  });

  test('a write failure returns false instead of throwing', () => {
    const { backing } = memoryBacking();
    backing.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    expect(createStorage(backing).save(emptyGarage())).toBe(false);
  });

  test('no backing means unavailable', () => {
    const storage = createStorage(null);
    expect(storage.load()).toEqual({ kind: 'unavailable' });
    expect(storage.save(emptyGarage())).toBe(false);
    expect(storage.raw()).toBeNull();
    expect(storage.discard()).toBe(true);
  });

  test('a read failure means unavailable', () => {
    const { backing } = memoryBacking();
    backing.getItem = () => {
      throw new Error('denied');
    };
    const storage = createStorage(backing);
    expect(storage.load()).toEqual({ kind: 'unavailable' });
    expect(storage.raw()).toBeNull();
  });

  test('raw returns the saved text', () => {
    const { backing } = memoryBacking({ [STORAGE_KEY]: 'saved' });
    expect(createStorage(backing).raw()).toBe('saved');
  });

  test('discard keeps the quarantined copy', () => {
    const { backing, items } = memoryBacking({ [STORAGE_KEY]: 'a', [QUARANTINE_KEY]: 'b' });
    expect(createStorage(backing).discard()).toBe(true);
    expect(items.has(STORAGE_KEY)).toBe(false);
    expect(items.get(QUARANTINE_KEY)).toBe('b');
  });

  test('discard reports failure', () => {
    const { backing } = memoryBacking();
    backing.removeItem = () => {
      throw new Error('denied');
    };
    expect(createStorage(backing).discard()).toBe(false);
  });
});

describe('browserBacking', () => {
  test('returns localStorage when it works', () => {
    expect(browserBacking()).toBe(window.localStorage);
    expect(localStorage.getItem('garage.probe')).toBeNull();
  });

  test('returns null when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(browserBacking()).toBeNull();
  });
});

test('emptyGarage copies the catalog so edits cannot leak into the seed', () => {
  const first = emptyGarage();
  const original = emptyGarage().serviceTypes[0]?.name;
  if (first.serviceTypes[0]) first.serviceTypes[0].name = 'changed';
  expect(emptyGarage().serviceTypes[0]?.name).toBe(original);
});
