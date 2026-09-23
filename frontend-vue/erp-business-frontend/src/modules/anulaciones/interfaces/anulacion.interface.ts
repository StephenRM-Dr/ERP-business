export type TipoDocumentoAnulable =
  | 'FACTURA_VENTA'
  | 'FACTURA_COMPRA'
  | 'DEVOLUCION_VENTA'
  | 'RECIBO_COBRO'
  | 'PAGO_PROVEEDOR'
  | 'TRANSFERENCIA';

export interface DocumentoResumenItem {
  id: number;
  tipo_documento: TipoDocumentoAnulable;
  correlativo: string;
  fecha: string;
  tercero_nombre: string;
  moneda_id: number;
  monto_total: number;
  estado: string;
  observaciones?: string;
  es_anulable: boolean;
}

export interface AnularDocumentoRef {
  tipo_documento: TipoDocumentoAnulable;
  documento_id: number;
}

export interface AnularLotePayload {
  documentos: AnularDocumentoRef[];
  motivo: string;
  admin_password?: string;
}

export interface QueryDocumentosFilter {
  tipo_documento: TipoDocumentoAnulable;
  sucursal_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
  solo_activos?: boolean;
}
