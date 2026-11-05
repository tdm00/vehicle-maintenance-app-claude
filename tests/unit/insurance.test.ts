import { describe, expect, test } from 'vitest';
import {
  expiringPolicies,
  policiesForVehicle,
  policyStatus,
  telHref,
  vehicleNames,
} from '../../src/domain/insurance';
import { buildTaskList } from '../../src/domain/maintenance';
import { insurancePolicySchema } from '../../src/domain/schemas';
import { garage, policy, vehicle } from './builders';

const TODAY = '2026-11-04';

describe('policyStatus', () => {
  test.each([
    ['yesterday', '2026-11-03', 'expired'],
    ['today is still covered', '2026-11-04', 'expiringSoon'],
    ['in 30 days', '2026-12-04', 'expiringSoon'],
    ['in 31 days', '2026-12-05', 'active'],
    ['far ahead', '2027-11-04', 'active'],
  ])('%s', (_label, expirationDate, expected) => {
    expect(policyStatus({ expirationDate }, TODAY)).toBe(expected);
  });
});

test('policiesForVehicle finds shared policies', () => {
  const shared = policy({ vehicleIds: ['a', 'b'] });
  const other = policy({ id: 'other', vehicleIds: ['c'] });
  expect(policiesForVehicle([shared, other], 'b')).toEqual([shared]);
});

describe('expiringPolicies', () => {
  test('soonest first, leaving out active ones', () => {
    const later = policy({ id: 'later', expirationDate: '2026-11-20' });
    const lapsed = policy({ id: 'lapsed', expirationDate: '2026-01-01' });
    const fine = policy({ id: 'fine', expirationDate: '2027-11-01' });
    expect(expiringPolicies([later, fine, lapsed], TODAY).map((p) => p.id)).toEqual([
      'lapsed',
      'later',
    ]);
  });

  test('a policy covering no vehicles raises no reminder', () => {
    expect(
      expiringPolicies([policy({ vehicleIds: [], expirationDate: '2020-01-01' })], TODAY),
    ).toEqual([]);
  });

  test('does not reorder the stored list', () => {
    const list = [
      policy({ id: 'b', expirationDate: '2026-11-20' }),
      policy({ id: 'a', expirationDate: '2026-11-10' }),
    ];
    expiringPolicies(list, TODAY);
    expect(list.map((p) => p.id)).toEqual(['b', 'a']);
  });
});

test('buildTaskList includes expiring insurance', () => {
  const soon = policy({ expirationDate: '2026-11-10' });
  const data = garage({ vehicles: [vehicle()], insurancePolicies: [soon] });
  expect(buildTaskList(data, TODAY).insurance).toEqual([soon]);
});

test('vehicleNames', () => {
  const vehicles = [
    vehicle({ id: 'a', description: 'One' }),
    vehicle({ id: 'b', description: 'Two' }),
  ];
  expect(vehicleNames(policy({ vehicleIds: ['a', 'b'] }), vehicles)).toBe('One, Two');
  expect(vehicleNames(policy({ vehicleIds: [] }), vehicles)).toBe('No vehicles');
});

test.each([
  ['800-555-0100', 'tel:8005550100'],
  ['(800) 555 0100', 'tel:8005550100'],
  ['+1 800.555.0100', 'tel:+18005550100'],
  ['call agent', null],
  ['', null],
])('telHref(%s)', (phone, expected) => {
  expect(telHref(phone)).toBe(expected);
});

describe('schema', () => {
  test('accepts a policy, with phone and notes optional', () => {
    const { phone: _phone, notes: _notes, ...required } = policy();
    expect(insurancePolicySchema.parse(required)).toEqual(policy());
  });

  test.each([
    ['blank company', { company: '  ' }],
    ['blank policy number', { policyNumber: '' }],
    ['missing expiration', { expirationDate: '' }],
    ['impossible expiration', { expirationDate: '2026-02-30' }],
  ])('rejects %s', (_label, overrides) => {
    expect(insurancePolicySchema.safeParse({ ...policy(), ...overrides }).success).toBe(false);
  });
});
