import { flushSync } from 'react-dom';
import type { z } from 'zod';
import { isBelowKnownOdometer, isImplausibleJump } from '../domain/odometer';

export type FieldErrors = Record<string, string>;

export const FUTURE_DATE_ERROR = "The date can't be in the future";

/** The first message for each field, keyed by field name. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    errors[key] ??= issue.message;
  }
  return errors;
}

/**
 * Shows errors and moves keyboard and screen-reader users to the first one. Rendering first, in
 * the same tick, means focus can't land late and pull the next keystrokes into the wrong field.
 */
export function reportErrors(
  form: HTMLFormElement | null,
  setErrors: (errors: FieldErrors) => void,
  errors: FieldErrors,
) {
  flushSync(() => setErrors(errors));
  form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

const PLAIN_NUMBER = /^\d+(\.\d+)?$|^\.\d+$/;

/**
 * Parses a number field. Blank becomes undefined, so optional fields can stay empty. Anything else
 * unreadable becomes NaN, which validation rejects, so bad input is never mistaken for blank.
 */
export function toNumber(value: string): number | undefined {
  const cleaned = value.replace(/,/g, '').trim();
  if (cleaned === '') return undefined;
  return PLAIN_NUMBER.test(cleaned) ? Number(cleaned) : Number.NaN;
}

const miles = (value: number) => value.toLocaleString('en-US');

/** The mileage hint for a new entry, flagging readings that look wrong before they're saved. */
export function mileageHint(reading: number | undefined, known: number, otherwise: string): string {
  if (isImplausibleJump(reading, known) && reading !== undefined) {
    return `That's ${miles(reading - known)} mi above the current mileage. Please double-check it.`;
  }
  if (isBelowKnownOdometer(reading, known)) {
    return `This is below the current ${miles(known)} mi. That's fine for older entries.`;
  }
  return otherwise;
}
