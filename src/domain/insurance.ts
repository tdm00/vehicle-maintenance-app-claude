import { daysBetween } from './dates';
import type { InsurancePolicy, Vehicle } from './schemas';

export const EXPIRING_SOON_DAYS = 30;

export type PolicyStatus = 'expired' | 'expiringSoon' | 'active';

export function policyStatus(
  policy: Pick<InsurancePolicy, 'expirationDate'>,
  today: string,
): PolicyStatus {
  const days = daysBetween(today, policy.expirationDate);
  if (days < 0) return 'expired';
  return days <= EXPIRING_SOON_DAYS ? 'expiringSoon' : 'active';
}

export function policiesForVehicle(
  policies: InsurancePolicy[],
  vehicleId: string,
): InsurancePolicy[] {
  return policies.filter((policy) => policy.vehicleIds.includes(vehicleId));
}

/** Policies needing attention, soonest first. One covering no vehicles needs no reminder. */
export function expiringPolicies(policies: InsurancePolicy[], today: string): InsurancePolicy[] {
  return policies
    .filter((policy) => policy.vehicleIds.length > 0 && policyStatus(policy, today) !== 'active')
    .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
}

export function vehicleNames(policy: InsurancePolicy, vehicles: Vehicle[]): string {
  const names = vehicles
    .filter((vehicle) => policy.vehicleIds.includes(vehicle.id))
    .map((vehicle) => vehicle.description);
  return names.length > 0 ? names.join(', ') : 'No vehicles';
}

/** A dialable tel: link, or null when the text has no digits to dial. */
export function telHref(phone: string): string | null {
  const dialable = phone.replace(/[^\d+]/g, '');
  return /\d/.test(dialable) ? `tel:${dialable}` : null;
}
