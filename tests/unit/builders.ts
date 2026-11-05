import type {
  FuelFillUp,
  GarageData,
  InsurancePolicy,
  ServiceRecord,
  ServiceType,
  Vehicle,
} from '../../src/domain/schemas';

let nextId = 1;
const id = (prefix: string) => `${prefix}-${nextId++}`;

export const vehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: 'car',
  description: 'Daily driver',
  make: 'Ford',
  model: 'Escape',
  year: 2010,
  color: '#2563eb',
  bodyType: 'suv',
  powertrain: 'gas',
  enteredOdometer: 50_000,
  ignoredServiceTypeIds: [],
  ...overrides,
});

export const record = (overrides: Partial<ServiceRecord> = {}): ServiceRecord => ({
  id: id('record'),
  vehicleId: 'car',
  date: '2026-01-01',
  serviceTypeIds: ['oil-change'],
  notes: '',
  ...overrides,
});

export const fill = (overrides: Partial<FuelFillUp> = {}): FuelFillUp => ({
  id: id('fill'),
  vehicleId: 'car',
  date: '2026-01-01',
  odometer: 1000,
  gallons: 10,
  costCents: 3000,
  isFull: true,
  ...overrides,
});

export const serviceType = (overrides: Partial<ServiceType> = {}): ServiceType => ({
  id: 'oil-change',
  name: 'Oil change',
  intervalMiles: 5000,
  intervalMonths: 6,
  powertrains: ['gas', 'diesel', 'hybrid'],
  isCustom: false,
  isHidden: false,
  intervalsEdited: false,
  ...overrides,
});

export const policy = (overrides: Partial<InsurancePolicy> = {}): InsurancePolicy => ({
  id: 'policy',
  vehicleIds: ['car'],
  company: 'Sample Mutual',
  policyNumber: 'SM-1',
  expirationDate: '2027-06-01',
  phone: '',
  notes: '',
  ...overrides,
});

export const garage = (overrides: Partial<GarageData> = {}): GarageData => ({
  vehicles: [],
  serviceRecords: [],
  fuelFillUps: [],
  serviceTypes: [],
  insurancePolicies: [],
  settings: { lastBackupAt: null },
  ...overrides,
});
