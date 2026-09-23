import type { Compra, CompraDetalle, CreateCompraPayload } from './compra.interface';

/** Raw shape returned by GET/POST /compras (backend/src/compras). */
export interface CompraDto {
  id: number;
  sucursal_id: number;
  numero_factura: string;
  proveedor_id: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  moneda_id: number;
  tasa_cambio: string;
  status: string;
  total_bruto: string;
  base_exenta: string;
  base_imponible: string;
  monto_iva: string;
  igtf_porcentaje: string;
  igtf_monto: string;
  total_neto: string;
  observaciones: string | null;
}

/** Payload shape expected by POST /compras. */
export interface CreateCompraDtoInput {
  sucursal_id: number;
  numero_factura: string;
  proveedor_id: number;
  fecha_vencimiento: string;
  moneda_id: number;
  tasa_cambio: number;
  total_bruto: number;
  base_exenta: number;
  base_imponible: number;
  monto_iva: number;
  igtf_porcentaje: number;
  igtf_monto: number;
  total_neto: number;
  usuario_id: number;
  observaciones?: string;
  detalles: {
    producto_id: number;
    deposito_id: number;
    lote_id?: number;
    cantidad: number;
    costo_unitario: number;
    es_exento: boolean;
    impuesto_porcentaje: number;
    monto_iva_linea: number;
    neto_linea: number;
  }[];
}

export function toCompra(dto: CompraDto): Compra {
  return {
    id: String(dto.id),
    sucursalId: dto.sucursal_id,
    numeroFactura: dto.numero_factura,
    proveedorId: dto.proveedor_id,
    fechaEmision: dto.fecha_emision,
    fechaVencimiento: dto.fecha_vencimiento,
    monedaId: dto.moneda_id,
    tasaCambio: Number(dto.tasa_cambio),
    status: dto.status,
    totalBruto: Number(dto.total_bruto),
    baseExenta: Number(dto.base_exenta),
    baseImponible: Number(dto.base_imponible),
    montoIva: Number(dto.monto_iva),
    igtfPorcentaje: Number(dto.igtf_porcentaje),
    igtfMonto: Number(dto.igtf_monto),
    totalNeto: Number(dto.total_neto),
    observaciones: dto.observaciones ?? '',
  };
}

function toCompraDetalleDtoInput(detalle: CompraDetalle): CreateCompraDtoInput['detalles'][number] {
  return {
    producto_id: detalle.productoId,
    deposito_id: detalle.depositoId,
    lote_id: detalle.loteId ?? undefined,
    cantidad: detalle.cantidad,
    costo_unitario: detalle.costoUnitario,
    es_exento: detalle.esExento,
    impuesto_porcentaje: detalle.impuestoPorcentaje,
    monto_iva_linea: detalle.montoIvaLinea,
    neto_linea: detalle.netoLinea,
  };
}

export function toCreateCompraDtoInput(payload: CreateCompraPayload): CreateCompraDtoInput {
  return {
    sucursal_id: payload.sucursalId,
    numero_factura: payload.numeroFactura,
    proveedor_id: payload.proveedorId,
    fecha_vencimiento: payload.fechaVencimiento,
    moneda_id: payload.monedaId,
    tasa_cambio: payload.tasaCambio,
    total_bruto: payload.totalBruto,
    base_exenta: payload.baseExenta,
    base_imponible: payload.baseImponible,
    monto_iva: payload.montoIva,
    igtf_porcentaje: payload.igtfPorcentaje,
    igtf_monto: payload.igtfMonto,
    total_neto: payload.totalNeto,
    usuario_id: payload.usuarioId,
    observaciones: payload.observaciones || undefined,
    detalles: payload.detalles.map(toCompraDetalleDtoInput),
  };
}
