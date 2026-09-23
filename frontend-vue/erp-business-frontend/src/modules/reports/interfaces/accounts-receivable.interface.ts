/** A single accounts-receivable row: how much is still owed on one document. */
export interface AccountsReceivableEntry {
  id: string;
  clienteId: string;
  tipoDocumento: string;
  numeroDocumento: string;
  facturaId: number | null;
  /** ISO timestamp — when the document was created (`cuentas_cobrar.fecha_emision`). */
  fechaEmision: string;
  fechaVencimiento: string;
  montoOriginal: number;
  saldoPendiente: number;
  monedaId: number;
  /** Exchange rate in effect when this document was created (`cuentas_cobrar.tasa_cambio`). */
  tasaCambio: number;
  status: string;
}
