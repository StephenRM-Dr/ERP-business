/** One invoice row as shown in the sales report — read-only, backend is the source of truth. */
export interface SalesReportEntry {
  id: string;
  numeroFactura: string;
  clienteId: string;
  monedaId: number;
  subtotal: number;
  montoIva: number;
  igtf: number;
  total: number;
  estado: string;
  fechaEmision: string;
  usuarioId?: number | null;
  usuarioNombre?: string | null;
  vendedorId?: number | null;
  vendedorNombre?: string | null;
  porcentajeVendedor1?: number;
  vendedorSecundarioId?: number | null;
  vendedorSecundarioNombre?: string | null;
  porcentajeVendedor2?: number;
}
