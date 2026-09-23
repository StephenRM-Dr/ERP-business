import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { Transferencia } from '../transferencias/entities/transferencia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Almacen } from '../almacenes/entities/almacen.entity';
import { Producto } from '../productos/entities/producto.entity';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Transferencia)
    private readonly transferenciaRepository: Repository<Transferencia>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createStockDto: CreateStockDto) {
    const existing = await this.stockRepository.findOne({
      where: {
        producto_id: createStockDto.producto_id,
        deposito_id: createStockDto.almacen_id,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un registro de stock para el producto ${createStockDto.producto_id} en el almacén ${createStockDto.almacen_id}`,
      );
    }

    const stock = this.stockRepository.create({
      producto_id: createStockDto.producto_id,
      deposito_id: createStockDto.almacen_id,
      existencia: createStockDto.cantidad,
      reservado: 0,
    });
    const saved = await this.stockRepository.save(stock);
    return {
      id: saved.id,
      producto_id: saved.producto_id,
      almacen_id: saved.deposito_id,
      cantidad: saved.existencia,
      actualizado_en: new Date().toISOString(),
    };
  }

  async findAll(productoId?: number, almacenId?: number, sucursalId?: number) {
    const where: any = {};
    if (productoId) where.producto_id = productoId;
    if (almacenId) where.deposito_id = almacenId;

    // El stock no guarda sucursal: se acota por los depósitos de esa sucursal.
    // Si no tiene ninguno, el listado va vacío en vez de caer al sin-filtro.
    if (sucursalId) {
      const depositos = await this.dataSource
        .getRepository(Almacen)
        .find({ where: { sucursal_id: sucursalId }, select: { id: true } });
      const depositoIds = depositos.map((d) => d.id);
      if (depositoIds.length === 0) {
        return [];
      }
      if (almacenId) {
        // Un almacén de otra sucursal no se filtra: no devuelve nada.
        if (!depositoIds.includes(almacenId)) {
          return [];
        }
      } else {
        where.deposito_id = In(depositoIds);
      }
    }

    const stocks = await this.stockRepository.find({
      where,
      order: { id: 'DESC' },
    });

    // Map internal fields to frontend expected fields
    return stocks.map((stock) => ({
      id: stock.id,
      producto_id: stock.producto_id,
      almacen_id: stock.deposito_id,
      cantidad: stock.existencia,
      actualizado_en: new Date().toISOString(),
    }));
  }

  async findOne(id: number) {
    const stock = await this.stockRepository.findOne({ where: { id } });
    if (!stock) throw new NotFoundException(`Stock con ID ${id} no encontrado`);
    return stock;
  }

  async update(
    id: number,
    updateStockDto: UpdateStockDto,
    usuarioId: number,
    sucursalId: number = 1,
  ) {
    const stock = await this.findOne(id);

    if (updateStockDto.cantidad === undefined) {
      return {
        id: stock.id,
        producto_id: stock.producto_id,
        almacen_id: stock.deposito_id,
        cantidad: stock.existencia,
        actualizado_en: new Date().toISOString(),
      };
    }

    const cantidadAnterior = Number(stock.existencia);
    const cantidadNueva = updateStockDto.cantidad;
    const diferencia = cantidadNueva - cantidadAnterior;

    let numeroDocumento: string | null = null;

    await this.dataSource.transaction(async (manager) => {
      if (diferencia === 0) {
        return;
      }

      // Same atomic-correlativo pattern as transferencias.service.ts's
      // create(), with codigo 'AJ' reserved exclusively for manual
      // adjustments (transfers use 'C'/'D'/'TR').
      let numeroDoc = 'AJ-' + Date.now(); // Fallback if tipos_documentos has no AJ row for this sucursal
      const result = await manager.query(
        `UPDATE tipos_documentos SET correlativo_actual = correlativo_actual + 1, actualizado_en = NOW() WHERE sucursal_id = $1 AND codigo = 'AJ' RETURNING correlativo_actual, longitud_formato, prefijo`,
        [sucursalId],
      );
      if (result && result[0] && result[0].length > 0) {
        const conf = result[0][0];
        const correlativoStr = String(conf.correlativo_actual).padStart(conf.longitud_formato, '0');
        const prefijo = conf.prefijo ? conf.prefijo : 'AJ-';
        numeroDoc = prefijo + correlativoStr;
      }
      numeroDocumento = numeroDoc;

      // Manual stock adjustments are logged as CARGO/DESCARGO movements in
      // the same inventario_movimientos ledger transfers use, so every
      // change to stock (transfer or manual edit) is auditable in one place.
      // cantidad_anterior/cantidad_posterior capture the audit-trail snapshot
      // the adjustment's printed document shows.
      const tipoMovimiento = diferencia > 0 ? 'CARGO' : 'DESCARGO';
      const movimiento = this.transferenciaRepository.create({
        numero_documento: numeroDoc,
        tipo_movimiento: tipoMovimiento,
        deposito_origen_id: tipoMovimiento === 'DESCARGO' ? stock.deposito_id : undefined,
        deposito_destino_id: tipoMovimiento === 'CARGO' ? stock.deposito_id : undefined,
        estado: 'RECEIVED_CONFIRMED',
        motivo: updateStockDto.motivo || 'Ajuste manual de inventario',
        usuario_id: usuarioId,
        sucursal_id: sucursalId,
        items: [
          {
            producto_id: stock.producto_id,
            cantidad: Math.abs(diferencia),
            cantidad_recibida: Math.abs(diferencia),
            costo_unitario: 0,
            cantidad_anterior: cantidadAnterior,
            cantidad_posterior: cantidadNueva,
          },
        ],
      });
      // Do NOT also set stock.existencia here: the trg_inv_movimientos DB
      // trigger applies +/- item.cantidad to inventario_stock as soon as the
      // item above is inserted. Setting it explicitly too was applying the
      // adjustment twice (0 -> 25 ended up persisted as 50) — found by
      // testing this exact flow end-to-end in the browser.
      await manager.save(movimiento);
    });

    return {
      id: stock.id,
      producto_id: stock.producto_id,
      almacen_id: stock.deposito_id,
      // stock.existencia (the in-memory entity) is stale — the DB trigger
      // updated the persisted row directly, not this object. cantidadNueva
      // is exactly what it should now equal.
      cantidad: cantidadNueva,
      actualizado_en: new Date().toISOString(),
      numero_documento: numeroDocumento,
      motivo: updateStockDto.motivo ?? null,
      cantidad_anterior: cantidadAnterior,
    };
  }

  async findMovimientos(stockId: number) {
    const stock = await this.findOne(stockId);
    const movimientos = await this.transferenciaRepository
      .createQueryBuilder('movimiento')
      .innerJoinAndSelect(
        'movimiento.items',
        'item',
        'item.producto_id = :productoId',
        { productoId: stock.producto_id },
      )
      .where(
        '(movimiento.deposito_origen_id = :depositoId OR movimiento.deposito_destino_id = :depositoId)',
        { depositoId: stock.deposito_id },
      )
      .orderBy('movimiento.fecha_operacion', 'DESC')
      .getMany();

    // Resolve "who made this adjustment" without exposing the full Usuario
    // entity (it carries clave_hash — the password hash — and GET /usuarios
    // is gated behind master.usuarios, which most cashiers won't have).
    // Explicit select here keeps this endpoint safe for any authenticated user.
    const usuarioIds = [...new Set(movimientos.map((m) => m.usuario_id))];
    const usuarios = usuarioIds.length
      ? await this.dataSource.getRepository(Usuario).find({
          where: { id: In(usuarioIds) },
          select: { id: true, nombre_completo: true },
        })
      : [];
    const nombreById = new Map(usuarios.map((u) => [u.id, u.nombre_completo]));

    return movimientos.map((m) => ({
      ...m,
      usuario_nombre: nombreById.get(m.usuario_id) ?? null,
    }));
  }

  async findKardex(query: {
    productoId?: number;
    depositoId?: number;
    sucursalId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    tipoClasificado?: string;
  }) {
    const qb = this.transferenciaRepository
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.items', 'item');

    if (query.productoId) {
      qb.andWhere('item.producto_id = :productoId', { productoId: query.productoId });
    }
    if (query.depositoId) {
      qb.andWhere(
        '(m.deposito_origen_id = :depositoId OR m.deposito_destino_id = :depositoId)',
        { depositoId: query.depositoId },
      );
    }
    if (query.sucursalId) {
      qb.andWhere('m.sucursal_id = :sucursalId', { sucursalId: query.sucursalId });
    }
    if (query.fechaDesde) {
      qb.andWhere('m.fecha_operacion >= :fechaDesde', { fechaDesde: query.fechaDesde });
    }
    if (query.fechaHasta) {
      qb.andWhere('m.fecha_operacion <= :fechaHasta', { fechaHasta: query.fechaHasta });
    }

    qb.orderBy('m.fecha_operacion', 'DESC').addOrderBy('m.id', 'DESC');

    const movimientos = await qb.getMany();

    const usuarioIds = [...new Set(movimientos.map((m) => m.usuario_id))];
    const usuarios = usuarioIds.length
      ? await this.dataSource.getRepository(Usuario).find({
          where: { id: In(usuarioIds) },
          select: { id: true, nombre_completo: true },
        })
      : [];
    const nombreUsuarioById = new Map(usuarios.map((u) => [u.id, u.nombre_completo]));

    const almacenes = await this.dataSource.getRepository(Almacen).find();
    const nombreAlmacenById = new Map(almacenes.map((a) => [a.id, a.nombre]));

    const productoIds = [
      ...new Set(movimientos.flatMap((m) => m.items.map((i) => i.producto_id))),
    ];
    const productos = productoIds.length
      ? await this.dataSource.getRepository(Producto).find({
          where: { id: In(productoIds) },
        })
      : [];
    const prodById = new Map(productos.map((p) => [p.id, p]));

    const kardexRows: any[] = [];

    for (const m of movimientos) {
      const docOrig = (m.documento_origen || m.numero_documento || '').toUpperCase();
      const tipoBase = (m.tipo_movimiento || '').toUpperCase();
      const motivoText = (m.motivo || '').toLowerCase();

      let tipoClasificado = 'DESCARGO';
      let tipoClasificadoNombre = 'Descargo (Salida Directa)';

      if (docOrig.startsWith('TRF-') || motivoText.includes('transformaci')) {
        if (tipoBase === 'CARGO') {
          tipoClasificado = 'CARGO_TRANSFORMACION';
          tipoClasificadoNombre = 'Cargo (Transformación)';
        } else {
          tipoClasificado = 'DESCARGO_TRANSFORMACION';
          tipoClasificadoNombre = 'Descargo (Transformación)';
        }
      } else if (docOrig.startsWith('FAC-') || motivoText.includes('venta') || motivoText.includes('factura')) {
        tipoClasificado = 'VENTA';
        tipoClasificadoNombre = 'Venta / Facturación';
      } else if (docOrig.startsWith('COM-') || motivoText.includes('compra')) {
        tipoClasificado = 'COMPRA';
        tipoClasificadoNombre = 'Compra a Proveedor';
      } else if (docOrig.startsWith('AJ-') || docOrig.startsWith('BAJA-') || motivoText.includes('ajuste')) {
        tipoClasificado = 'AJUSTE';
        tipoClasificadoNombre = 'Ajuste de Existencia';
      } else if (tipoBase === 'TRANSFERENCIA') {
        tipoClasificado = 'TRANSFERENCIA';
        tipoClasificadoNombre = 'Transferencia entre Almacenes';
      } else if (tipoBase === 'CARGO') {
        tipoClasificado = 'CARGO';
        tipoClasificadoNombre = 'Cargo (Entrada Directa)';
      } else {
        tipoClasificado = 'DESCARGO';
        tipoClasificadoNombre = 'Descargo (Salida Directa)';
      }

      if (query.tipoClasificado && query.tipoClasificado !== 'TODOS' && tipoClasificado !== query.tipoClasificado) {
        continue;
      }

      for (const item of m.items) {
        if (query.productoId && item.producto_id !== query.productoId) {
          continue;
        }

        const prod = prodById.get(item.producto_id);
        const ctd = Number(item.cantidad);
        const esEntrada = tipoBase === 'CARGO' || tipoClasificado === 'COMPRA' || tipoClasificado === 'CARGO_TRANSFORMACION';

        kardexRows.push({
          id: `${m.id}-${item.id}`,
          movimientoId: m.id,
          numeroDocumento: m.numero_documento,
          documentoOrigen: m.documento_origen,
          fechaOperacion: m.fecha_operacion,
          tipoMovimiento: m.tipo_movimiento,
          tipoClasificado,
          tipoClasificadoNombre,
          depositoOrigenId: m.deposito_origen_id,
          depositoOrigenNombre: m.deposito_origen_id ? nombreAlmacenById.get(m.deposito_origen_id) : null,
          depositoDestinoId: m.deposito_destino_id,
          depositoDestinoNombre: m.deposito_destino_id ? nombreAlmacenById.get(m.deposito_destino_id) : null,
          motivo: m.motivo,
          observaciones: m.observaciones,
          usuarioId: m.usuario_id,
          usuarioNombre: nombreUsuarioById.get(m.usuario_id) ?? null,
          productoId: item.producto_id,
          productoCodigo: prod?.codigo ?? `#${item.producto_id}`,
          productoNombre: prod?.nombre ?? 'Producto',
          cantidadEntrada: esEntrada ? ctd : 0,
          cantidadSalida: esEntrada ? 0 : ctd,
          costoUnitario: Number(item.costo_unitario ?? prod?.precio_costo ?? 0),
          pesoKgUnitario: Number(item.peso_kg ?? prod?.peso_kg ?? 0),
          pesoTotalKg: Number(item.peso_kg ?? prod?.peso_kg ?? 0) * ctd,
          unidadMedida: prod?.unidad_medida ?? 'pza',
        });
      }
    }

    return kardexRows;
  }

  async remove(id: number, usuarioId: number, sucursalId: number): Promise<void> {
    const stock = await this.findOne(id);

    await this.dataSource.transaction(async (manager) => {
      // Registrar el borrado en el ledger antes de eliminar la fila, para que
      // el historial explique por qué desaparecieron las existencias.
      // Solo se genera el movimiento si la existencia es > 0; si ya estaba en 0
      // el borrado no tiene impacto en el inventario físico y tampoco deja
      // diferencia que auditar (pero la fila del ledger queda igual como evidencia).
      const cantidadAnterior = Number(stock.existencia);
      const numeroDoc = 'BAJA-' + Date.now();

      const movimiento = this.transferenciaRepository.create({
        numero_documento: numeroDoc,
        tipo_movimiento: 'DESCARGO',
        deposito_origen_id: stock.deposito_id,
        deposito_destino_id: undefined,
        estado: 'RECEIVED_CONFIRMED',
        motivo: 'Eliminación de registro de stock',
        // usuario_id y sucursal_id del operador que hizo el DELETE.
        usuario_id: usuarioId,
        sucursal_id: sucursalId,
        items: [
          {
            producto_id: stock.producto_id,
            cantidad: cantidadAnterior,
            cantidad_recibida: cantidadAnterior,
            costo_unitario: 0,
            cantidad_anterior: cantidadAnterior,
            cantidad_posterior: 0,
          },
        ],
      });
      await manager.save(movimiento);

      try {
        await manager.remove(stock);
      } catch (error) {
        const code = (error as any)?.code ?? (error as any)?.driverError?.code;
        if (code === '23503' || code === '23001') {
          throw new ConflictException(
            `No se puede eliminar el stock con ID ${id} porque tiene movimientos de inventario asociados`,
          );
        }
        throw error;
      }
    });
  }
}

