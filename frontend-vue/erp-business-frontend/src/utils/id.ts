/**
 * Generates a random ID for client-only (mock) records.
 *
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS, or
 * http://localhost) — it's `undefined` when the app is accessed over plain
 * HTTP on a LAN IP (e.g. http://192.168.x.x:5173), which silently breaks any
 * "create" action relying on it. This falls back to a non-cryptographic
 * UUID-shaped string in that case.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
