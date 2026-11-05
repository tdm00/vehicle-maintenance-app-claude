import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { parseImport, parseSaved } from '../../src/store/storage';

// Saved by the real published v1 file. Never regenerate it: it pins what old data looks like.
const text = readFileSync('tests/fixtures/v1-save.json', 'utf8');
const original = JSON.parse(text).data;

test('the fixture really is version 1 data', () => {
  expect(JSON.parse(text).schemaVersion).toBe(1);
  expect(original).not.toHaveProperty('insurancePolicies');
});

test.each([
  ['browser data', parseSaved],
  ['a backup file', parseImport],
])('%s from v1 upgrades with nothing lost', (_label, parse) => {
  const result = parse(text);
  if (result.kind !== 'ok') throw new Error(result.kind);
  expect(result.data.vehicles).toEqual(original.vehicles);
  expect(result.data.serviceRecords).toEqual(original.serviceRecords);
  expect(result.data.fuelFillUps).toEqual(original.fuelFillUps);
  expect(result.data.serviceTypes).toEqual(original.serviceTypes);
  expect(result.data.settings).toEqual(original.settings);
  expect(result.data.insurancePolicies).toEqual([]);
});
