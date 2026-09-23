const LOCALE_BY_CURRENCY: Record<string, string> = {
  VES: 'es-VE',
  COP: 'es-CO',
  USD: 'en-US',
  USDT: 'en-US',
  BSUSDT: 'es-VE',
  VES020: 'es-VE',
};

const SYMBOL_BY_CURRENCY: Record<string, string> = {
  USDT: 'USDT',
  BSUSDT: 'Bs',
  VES020: 'Bs',
};

export function formatMoney(value: number, currencyCode: string): string {
  const safeCode = (currencyCode ?? 'USD').trim();
  const locale = LOCALE_BY_CURRENCY[safeCode] ?? 'es-VE';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: safeCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback para códigos no estándar ISO 4217 (ej. criptomonedas como USDT)
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    const symbol = SYMBOL_BY_CURRENCY[safeCode] ?? safeCode;
    return `${symbol} ${formatted}`;
  }
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Retorna true si el código de moneda representa Bolívares (VES, VES020, BS, BSUSDT, etc.),
 * los cuales están exentos del Impuesto a las Grandes Transacciones Financieras (IGTF).
 */
export function isBolivares(currencyCode?: string | null): boolean {
  if (!currencyCode) return false;
  const code = currencyCode.trim().toUpperCase();
  return (
    code === 'VES' ||
    code.startsWith('VES') ||
    code.startsWith('BS') ||
    code === 'BOLIVAR' ||
    code === 'BOLIVARES'
  );
}

/**
 * Retorna true si es una divisa extranjera sujeta a IGTF (USD, USDT, COP, EUR, etc.).
 * Cualquier moneda nacional en Bolívares (VES, VES020) NO es divisa para efectos de IGTF.
 */
export function isForeignCurrency(currencyCode?: string | null): boolean {
  return !isBolivares(currencyCode);
}
