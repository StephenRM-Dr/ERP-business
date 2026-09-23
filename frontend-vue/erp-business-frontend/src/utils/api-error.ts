import axios from 'axios';

/**
 * Extracts the backend's own error message (e.g. NestJS's
 * `BadRequestException` body) when available, falling back to a generic
 * message otherwise. Backend messages are already human-readable text, not
 * i18n keys — use the result as-is, don't pass it through `t()`.
 */
export function resolveApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string | string[] } | undefined)?.message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }
  }
  return fallback;
}
