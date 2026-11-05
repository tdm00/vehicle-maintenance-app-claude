import type { z } from 'zod';

export type FieldErrors = Record<string, string>;

/** The first message for each field, keyed by field name. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Sends keyboard and screen-reader users to the first problem after a failed submit. */
export function focusFirstError(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}

/** Parses a number field. Blank and non-numeric input become undefined so validation reports it. */
export function toNumber(value: string): number | undefined {
  const cleaned = value.replace(/,/g, '').trim();
  if (cleaned === '') return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}
