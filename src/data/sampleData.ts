import { addDays, addMonths } from '../domain/dates';
import type { FuelFillUp, GarageData, ServiceRecord, Vehicle } from '../domain/schemas';

const crv: Vehicle = {
  id: 'sample-crv',
  description: 'Family SUV',
  make: 'Honda',
  model: 'CR-V',
  year: 2019,
  color: '#dc2626',
  bodyType: 'suv',
  powertrain: 'gas',
  enteredOdometer: 68_400,
  ignoredServiceTypeIds: [],
};

const truck: Vehicle = {
  id: 'sample-truck',
  description: 'Work truck',
  make: 'Ford',
  model: 'F-150',
  year: 2012,
  color: '#1e3a8a',
  bodyType: 'truck',
  powertrain: 'gas',
  enteredOdometer: 141_250,
  ignoredServiceTypeIds: [],
};

const tesla: Vehicle = {
  id: 'sample-ev',
  description: 'Commuter',
  make: 'Tesla',
  model: 'Model 3',
  year: 2022,
  color: '#f8fafc',
  bodyType: 'sedan',
  powertrain: 'electric',
  enteredOdometer: 31_800,
  ignoredServiceTypeIds: [],
};

/** Example data for trying the app, dated relative to today so it always looks current. */
export function sampleData(base: GarageData, today: string): GarageData {
  const monthsAgo = (months: number) => addMonths(today, -months);

  const record = (
    id: string,
    vehicleId: string,
    months: number,
    odometer: number,
    serviceTypeIds: string[],
    costCents: number,
  ): ServiceRecord => ({
    id,
    vehicleId,
    date: monthsAgo(months),
    odometer,
    serviceTypeIds,
    costCents,
    notes: '',
  });

  const fillUp = (
    id: string,
    months: number,
    odometer: number,
    gallons: number,
    costCents: number,
  ): FuelFillUp => ({
    id,
    vehicleId: crv.id,
    date: monthsAgo(months),
    odometer,
    gallons,
    costCents,
    isFull: true,
  });

  return {
    ...base,
    vehicles: [crv, truck, tesla],
    serviceRecords: [
      record('s1', crv.id, 2, 67_700, ['oil-change', 'tire-rotation'], 8_900),
      record('s2', crv.id, 14, 57_000, ['brake-inspection', 'cabin-air-filter'], 14_500),
      record('s3', truck.id, 9, 132_000, ['oil-change'], 6_500),
      record('s4', truck.id, 13, 130_000, ['tire-rotation', 'engine-air-filter'], 9_000),
      record('s5', tesla.id, 5, 27_000, ['tire-rotation'], 6_000),
    ],
    fuelFillUps: [
      fillUp('f1', 3, 67_400, 11.2, 3_920),
      fillUp('f2', 2, 67_740, 11.4, 3_990),
      fillUp('f3', 1, 68_080, 10.9, 3_815),
      fillUp('f4', 0, 68_400, 11.0, 3_850),
    ],
    insurancePolicies: [
      {
        id: 'sample-policy-family',
        vehicleIds: [crv.id, truck.id],
        company: 'Sample Mutual',
        policyNumber: 'SM-1001',
        expirationDate: addDays(today, 20),
        phone: '800-555-0100',
        notes: 'Covers both household vehicles.',
      },
      {
        id: 'sample-policy-ev',
        vehicleIds: [tesla.id],
        company: 'Example Insurance',
        policyNumber: 'EX-2002',
        expirationDate: addMonths(today, 5),
        phone: '',
        notes: '',
      },
    ],
  };
}
