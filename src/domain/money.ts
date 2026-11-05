const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/** Parses user input such as "45", "45.5", or "$1,045.50". Returns null when invalid. */
export function parseDollars(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  return Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
