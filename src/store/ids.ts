/**
 * crypto.randomUUID needs a secure context, which a plain-HTTP host is not.
 * getRandomValues works everywhere the app does.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
