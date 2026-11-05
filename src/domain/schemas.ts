import { z } from 'zod';

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isoDate = z
  .string()
  .regex(ISO_DATE, 'Enter a valid date')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }, 'Enter a valid date');

export const POWERTRAINS = ['gas', 'diesel', 'hybrid', 'electric'] as const;
export const BODY_TYPES = [
  'sedan',
  'coupe',
  'hatchback',
  'suv',
  'truck',
  'van',
  'motorcycle',
] as const;

const id = z.string().min(1).max(64);
const odometer = z
  .number('Enter the mileage')
  .int('Use whole miles')
  .min(0, 'Mileage cannot be negative')
  .max(2_000_000, 'That mileage looks too high');
const cents = z
  .number('Enter an amount')
  .int()
  .min(0, 'Cost cannot be negative')
  .max(100_000_000, 'That amount looks too high');

export const MIN_YEAR = 1950;

export const vehicleSchema = z.object({
  id,
  description: z.string().trim().min(1, 'Add a description').max(80),
  make: z.string().trim().min(1, 'Choose a make').max(60),
  model: z.string().trim().min(1, 'Choose a model').max(60),
  year: z.number('Choose a year').int().min(MIN_YEAR).max(2100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Choose a color'),
  bodyType: z.enum(BODY_TYPES),
  powertrain: z.enum(POWERTRAINS),
  enteredOdometer: odometer,
  ignoredServiceTypeIds: z.array(id).default([]),
});

export const serviceRecordSchema = z.object({
  id,
  vehicleId: id,
  date: isoDate,
  odometer: odometer.optional(),
  serviceTypeIds: z.array(id).min(1, 'Choose at least one service'),
  costCents: cents.optional(),
  notes: z.string().trim().max(500).default(''),
});

export const fuelFillUpSchema = z.object({
  id,
  vehicleId: id,
  date: isoDate,
  odometer,
  gallons: z.number('Enter the gallons').gt(0, 'Gallons must be above zero').max(1000),
  costCents: cents,
  isFull: z.boolean().default(true),
});

const interval = z.number().int().positive().nullable();

export const serviceTypeSchema = z.object({
  id,
  name: z.string().trim().min(1, 'Add a name').max(60),
  intervalMiles: interval,
  intervalMonths: interval,
  powertrains: z.array(z.enum(POWERTRAINS)).min(1),
  isCustom: z.boolean(),
  isHidden: z.boolean(),
  /** When true the user's intervals win over the suggested adjustments. */
  intervalsEdited: z.boolean().default(false),
});

export const insurancePolicySchema = z.object({
  id,
  /** Empty only when every covered vehicle was deleted; the policy is kept rather than lost. */
  vehicleIds: z.array(id),
  company: z.string().trim().min(1, 'Add the company').max(80),
  policyNumber: z.string().trim().min(1, 'Add the policy number').max(60),
  expirationDate: isoDate,
  phone: z.string().trim().max(30).default(''),
  notes: z.string().trim().max(500).default(''),
});

export const garageDataSchema = z.object({
  vehicles: z.array(vehicleSchema),
  serviceRecords: z.array(serviceRecordSchema),
  fuelFillUps: z.array(fuelFillUpSchema),
  serviceTypes: z.array(serviceTypeSchema),
  insurancePolicies: z.array(insurancePolicySchema),
  settings: z.object({ lastBackupAt: isoDate.nullable() }),
});

export type Powertrain = (typeof POWERTRAINS)[number];
export type BodyType = (typeof BODY_TYPES)[number];
export type Vehicle = z.infer<typeof vehicleSchema>;
export type ServiceRecord = z.infer<typeof serviceRecordSchema>;
export type FuelFillUp = z.infer<typeof fuelFillUpSchema>;
export type ServiceType = z.infer<typeof serviceTypeSchema>;
export type InsurancePolicy = z.infer<typeof insurancePolicySchema>;
export type GarageData = z.infer<typeof garageDataSchema>;
