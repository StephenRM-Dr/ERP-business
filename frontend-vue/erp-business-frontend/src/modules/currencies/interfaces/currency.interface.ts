/**
 * Currency handled by the system. VES is the base (legal) currency;
 * USD is the pricing reference currency for products. `code` is any ISO
 * code registered in the backend `monedas` catalog, not just the 3 seeded
 * ones — new currencies can be added from the Currencies screen.
 */
export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
}

/**
 * Form payload to register a new currency.
 */
export interface CreateCurrencyPayload {
  code: string;
  name: string;
  symbol: string;
}

/**
 * Bank exchange rate for one currency, expressed in VES per 1 unit.
 * Example: { currencyCode: 'USD', rate: 36.5 } means 1 USD = 36.50 VES.
 */
export interface ExchangeRate {
  id: string;
  currencyCode: Currency['code'];
  rate: number;
  /** Date-only (YYYY-MM-DD), for display. */
  effectiveDate: string;
  /**
   * Full ISO timestamp the rate was registered at — used to resolve which
   * rate is "latest" for a currency. `effectiveDate` alone can't do this:
   * two rates registered the same day would tie on it.
   */
  registeredAt: string;
}

/**
 * Form payload to register a new bank rate.
 */
export interface CreateExchangeRatePayload {
  currencyCode: Currency['code'];
  rate: number;
}
