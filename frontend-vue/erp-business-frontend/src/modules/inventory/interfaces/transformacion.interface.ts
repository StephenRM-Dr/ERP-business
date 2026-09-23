export type TipoTransformacion =
  | 'POR_METRO'
  | 'ROLLO_A_METROS'
  | 'TAZAS'
  | 'HOJILLA_COMBO'
  | 'SPLIT_FIJO';

export interface SplitItem {
  productoId: string;
  cantidad: number;
}

export interface InvReglaTransformacion {
  id: number;
  productoId: string;
  tipoTransformacion: TipoTransformacion;
  factor: number;
  splitItems: SplitItem[] | null;
  activo: boolean;
}

export interface CreateReglaTransformacionData {
  productoId: string;
  tipoTransformacion: TipoTransformacion;
  factor?: number;
  splitItems?: SplitItem[] | null;
}

export interface ItemResultado {
  productoId: string;
  cantidad: number;
  depositoId: string;
}

export type EstadoTransformacion = 'CONFIRMADA' | 'ANULADA';

export interface ItemTransformacionDoble {
  productoId: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  pesoKg: number;
  unidadMedida?: string;
}

export interface InvTransformacion {
  id: number;
  numeroDocumento: string;
  descargoDocumento?: string | null;
  cargoDocumento?: string | null;
  productoOrigenId?: string;
  cantidadOrigen?: number;
  depositoId?: string;
  depositoOrigenId?: string;
  depositoDestinoId?: string;
  depositoOrigenNombre?: string;
  depositoDestinoNombre?: string;
  movimientoDescargoId?: number;
  movimientoCargoId?: number;
  costoTotalConsumido?: number;
  costoTotalGenerado?: number;
  pesoTotalConsumidoKg?: number;
  pesoTotalGeneradoKg?: number;
  itemsConsumidos?: ItemTransformacionDoble[];
  itemsResultado?: ItemResultado[] | ItemTransformacionDoble[];
  estado: EstadoTransformacion;
  observacion: string | null;
  createdAt: string;
}

export interface PreviewTransformacion {
  regla: InvReglaTransformacion;
  itemsResultado: ItemResultado[];
}

/** Payload para transformación unitaria basada en reglas */
export interface EjecutarTransformacionData {
  productoId: string;
  cantidadOrigen: number;
  depositoId: string;
  depositoDestinoId?: string;
  observacion?: string;
}

/** Payload para transformación de doble módulo (Módulo 1: Consumo / Descargo y Módulo 2: Terminados / Cargo) */
export interface EjecutarTransformacionDobleData {
  depositoOrigenId: string;
  depositoDestinoId: string;
  observacion?: string;
  materialesConsumir: ItemTransformacionDoble[];
  productosGenerar: ItemTransformacionDoble[];
}

// --- DTOs del backend (snake_case) ---

export interface SplitItemDto {
  producto_id: number;
  cantidad: number;
}

export interface InvReglaTransformacionDto {
  id: number;
  producto_id: number;
  tipo_transformacion: TipoTransformacion;
  factor: number;
  split_items: SplitItemDto[] | null;
  activo: boolean;
}

export interface ItemResultadoDto {
  producto_id: number;
  cantidad: number;
  deposito_id: number;
}

export interface ItemTransformacionDobleDto {
  producto_id: number;
  codigo?: string;
  descripcion?: string;
  cantidad: number;
  costo_unitario?: number;
  peso_kg?: number;
  unidad_medida?: string;
}

export interface InvTransformacionDto {
  id: number;
  numero_documento: string;
  descargo_documento?: string | null;
  cargo_documento?: string | null;
  producto_origen_id?: number | null;
  cantidad_origen?: number | null;
  deposito_id?: number | null;
  deposito_origen_id?: number | null;
  deposito_destino_id?: number | null;
  deposito_origen?: { id: number; nombre: string; codigo?: string } | null;
  deposito_destino?: { id: number; nombre: string; codigo?: string } | null;
  movimiento_descargo_id?: number | null;
  movimiento_cargo_id?: number | null;
  costo_total_consumido?: number | string | null;
  costo_total_generado?: number | string | null;
  peso_total_consumido_kg?: number | string | null;
  peso_total_generado_kg?: number | string | null;
  items_consumidos?: ItemTransformacionDobleDto[] | null;
  items_resultado: ItemResultadoDto[] | ItemTransformacionDobleDto[];
  estado: EstadoTransformacion;
  observacion: string | null;
  creado_en: string;
}

export interface PreviewTransformacionDto {
  regla: InvReglaTransformacionDto;
  items_resultado: ItemResultadoDto[];
}

export interface EjecutarTransformacionDtoInput {
  producto_id: number;
  cantidad_origen: number;
  deposito_id: number;
  deposito_destino_id?: number;
  observacion?: string;
}

export interface CreateReglaTransformacionDtoInput {
  producto_id: number;
  tipo_transformacion: TipoTransformacion;
  factor?: number;
  split_items?: SplitItemDto[];
}

export interface CreateTransformacionDobleDtoInput {
  deposito_origen_id: number;
  deposito_destino_id: number;
  observacion?: string;
  materiales_consumir: ItemTransformacionDobleDto[];
  productos_generar: ItemTransformacionDobleDto[];
}

export function toInvReglaTransformacion(dto: InvReglaTransformacionDto): InvReglaTransformacion {
  return {
    id: dto.id,
    productoId: String(dto.producto_id),
    tipoTransformacion: dto.tipo_transformacion,
    factor: Number(dto.factor),
    splitItems: dto.split_items
      ? dto.split_items.map((item) => ({ productoId: String(item.producto_id), cantidad: Number(item.cantidad) }))
      : null,
    activo: dto.activo,
  };
}

function toItemResultado(dto: ItemResultadoDto): ItemResultado {
  return {
    productoId: String(dto.producto_id),
    cantidad: Number(dto.cantidad),
    depositoId: String(dto.deposito_id),
  };
}

export function toPreviewTransformacion(dto: PreviewTransformacionDto): PreviewTransformacion {
  return {
    regla: toInvReglaTransformacion(dto.regla),
    itemsResultado: dto.items_resultado.map(toItemResultado),
  };
}

export function toInvTransformacion(dto: InvTransformacionDto): InvTransformacion {
  return {
    id: dto.id,
    numeroDocumento: dto.numero_documento,
    descargoDocumento: dto.descargo_documento ?? undefined,
    cargoDocumento: dto.cargo_documento ?? undefined,
    productoOrigenId: dto.producto_origen_id ? String(dto.producto_origen_id) : undefined,
    cantidadOrigen: dto.cantidad_origen ? Number(dto.cantidad_origen) : undefined,
    depositoId: dto.deposito_id ? String(dto.deposito_id) : undefined,
    depositoOrigenId: dto.deposito_origen_id ? String(dto.deposito_origen_id) : undefined,
    depositoDestinoId: dto.deposito_destino_id ? String(dto.deposito_destino_id) : undefined,
    depositoOrigenNombre: dto.deposito_origen?.nombre,
    depositoDestinoNombre: dto.deposito_destino?.nombre,
    movimientoDescargoId: dto.movimiento_descargo_id ?? undefined,
    movimientoCargoId: dto.movimiento_cargo_id ?? undefined,
    costoTotalConsumido: dto.costo_total_consumido ? Number(dto.costo_total_consumido) : 0,
    costoTotalGenerado: dto.costo_total_generado ? Number(dto.costo_total_generado) : 0,
    pesoTotalConsumidoKg: dto.peso_total_consumido_kg ? Number(dto.peso_total_consumido_kg) : 0,
    pesoTotalGeneradoKg: dto.peso_total_generado_kg ? Number(dto.peso_total_generado_kg) : 0,
    itemsConsumidos: (dto.items_consumidos ?? []).map((item) => ({
      productoId: String(item.producto_id),
      codigo: item.codigo ?? '',
      descripcion: item.descripcion ?? '',
      cantidad: Number(item.cantidad),
      costoUnitario: Number(item.costo_unitario ?? 0),
      pesoKg: Number(item.peso_kg ?? 0),
      unidadMedida: item.unidad_medida,
    })),
    itemsResultado: (dto.items_resultado ?? []).map((item: any) => ({
      productoId: String(item.producto_id),
      codigo: item.codigo ?? '',
      descripcion: item.descripcion ?? '',
      cantidad: Number(item.cantidad),
      costoUnitario: Number(item.costo_unitario ?? 0),
      pesoKg: Number(item.peso_kg ?? 0),
      unidadMedida: item.unidad_medida,
      depositoId: item.deposito_id ? String(item.deposito_id) : '',
    })),
    estado: dto.estado,
    observacion: dto.observacion,
    createdAt: dto.creado_en,
  };
}

export function toEjecutarTransformacionDtoInput(
  data: EjecutarTransformacionData,
): EjecutarTransformacionDtoInput {
  const input: EjecutarTransformacionDtoInput = {
    producto_id: Number(data.productoId),
    cantidad_origen: data.cantidadOrigen,
    deposito_id: Number(data.depositoId),
  };
  if (data.depositoDestinoId !== undefined) {
    input.deposito_destino_id = Number(data.depositoDestinoId);
  }
  if (data.observacion && data.observacion.trim() !== '') {
    input.observacion = data.observacion.trim();
  }
  return input;
}

export function toCreateReglaTransformacionDtoInput(
  data: CreateReglaTransformacionData,
): CreateReglaTransformacionDtoInput {
  const input: CreateReglaTransformacionDtoInput = {
    producto_id: Number(data.productoId),
    tipo_transformacion: data.tipoTransformacion,
  };

  if (data.tipoTransformacion === 'SPLIT_FIJO') {
    input.split_items = (data.splitItems ?? []).map((item) => ({
      producto_id: Number(item.productoId),
      cantidad: Number(item.cantidad),
    }));
  } else if (data.factor !== undefined) {
    input.factor = Number(data.factor);
  }

  return input;
}

export function toCreateTransformacionDobleDtoInput(
  data: EjecutarTransformacionDobleData,
): CreateTransformacionDobleDtoInput {
  return {
    deposito_origen_id: Number(data.depositoOrigenId),
    deposito_destino_id: Number(data.depositoDestinoId),
    observacion: data.observacion?.trim() || undefined,
    materiales_consumir: data.materialesConsumir.map((m) => ({
      producto_id: Number(m.productoId),
      codigo: m.codigo,
      descripcion: m.descripcion,
      cantidad: Number(m.cantidad),
      costo_unitario: Number(m.costoUnitario),
      peso_kg: Number(m.pesoKg),
      unidad_medida: m.unidadMedida,
    })),
    productos_generar: data.productosGenerar.map((p) => ({
      producto_id: Number(p.productoId),
      codigo: p.codigo,
      descripcion: p.descripcion,
      cantidad: Number(p.cantidad),
      costo_unitario: Number(p.costoUnitario),
      peso_kg: Number(p.pesoKg),
      unidad_medida: p.unidadMedida,
    })),
  };
}
