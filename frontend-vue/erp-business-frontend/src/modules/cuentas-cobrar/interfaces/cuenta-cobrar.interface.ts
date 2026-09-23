export interface MovimientoCxC {
  id: string | number;
  tipo: string;
  tipoLabel: string;
  documentoNumero: string;
  documentoOrigen?: string | null;
  fecha: string;
  fechaVencimiento?: string | null;
  descripcion: string;
  monedaId: number;
  tasaCambio: number;
  debito: number;
  credito: number;
  saldoPendiente: number;
  status: string;
  usuario?: string | null;
  sucursalId?: number;
  sucursalSigla?: string;
  sucursalNombre?: string;
}

export interface ClienteCxCInfo {
  id: number;
  codigo: string;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface TotalesCxC {
  adelantos: number;
  apartados: number;
  devolucionesPendientes: number;
  debitos: number;
  creditos: number;
  saldo: number;
}

export interface ResumenClienteCxC {
  cliente: ClienteCxCInfo;
  totales: TotalesCxC;
  movimientos: MovimientoCxC[];
}

export interface CreateDocumentoCxCPayload {
  cliente_id: number;
  tipo_documento: 'FACTURA' | 'FACTURA_FINANCIERA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'ADELANTO' | 'GIRO' | 'AJUSTE';
  monto: number;
  moneda_id: number;
  sucursal_id?: number;
  tasa_cambio?: number;
  fecha_vencimiento?: string;
  factura_id?: number;
  cxc_id?: number;
  numero_documento?: string;
  motivo?: string;
  observaciones?: string;
}

export interface AplicarDocumentosCxCPayload {
  cliente_id: number;
  credito_cxc_id: number;
  aplicaciones: {
    debito_cxc_id: number;
    monto: number;
  }[];
}

export interface PagoDirectoCxCPayload {
  cliente_id: number;
  sucursal_id?: number;
  forma_pago: string;
  monto_total: number;
  moneda_pago_id: number;
  tasa_cambio?: number;
  cuenta_bancaria_id?: number;
  observaciones?: string;
  detalles: {
    cxc_id: number;
    monto_aplicado: number;
  }[];
}
