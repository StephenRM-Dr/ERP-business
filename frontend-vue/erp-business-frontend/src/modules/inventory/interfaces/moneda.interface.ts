/**
 * Currency as registered in the backend `monedas` catalog. This is a lighter,
 * inventory-scoped read of the same concept as the `currencies` module (which
 * models pricing/exchange-rate currencies) — kept separate so integrating the
 * product form's moneda select doesn't touch that already-working module.
 */
export interface Moneda {
  id: number;
  codigoIso: string;
  descripcion: string;
  simbolo: string;
  esMonedaBase: boolean;
  activo: boolean;
}
