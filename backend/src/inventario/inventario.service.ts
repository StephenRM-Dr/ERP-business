import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  InvReglaTransformacion,
  SplitItem,
  TipoTransformacion,
} from './entities/inv-regla-transformacion.entity';
import { InvTransformacion, ItemTransformacionDetalle, ItemResultado } from './entities/inv-transformacion.entity';
import {
  CreateReglaTransformacionDto,
  EjecutarTransformacionDto,
} from './dto/create-transformacion.dto';
import { CreatePreliminarInventarioDto } from './dto/create-preliminar-inventario.dto';
import { UpdatePreliminarInventarioDto } from './dto/update-preliminar-inventario.dto';
import { CreateTransformacionDobleDto } from './dto/create-transformacion-doble.dto';
import { QueryInventarioDto } from './dto/query-inventario.dto';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { canViewAllLocations } from '../auth/can-view-all-locations';
import { DocumentoPreliminar } from '../preliminares/entities/documento-preliminar.entity';
import { Stock } from '../stock/entities/stock.entity';
import { Almacen } from '../almacenes/entities/almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Transferencia } from '../transferencias/entities/transferencia.entity';
import { TransferenciaItem } from '../transferencias/entities/transferencia-item.entity';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(InvReglaTransformacion)
    private readonly reglaRepo: Repository<InvReglaTransformacion>,

    @InjectRepository(InvTransformacion)
    private readonly transformacionRepo: Repository<InvTransformacion>,

    @InjectRepository(DocumentoPreliminar)
    private readonly preliminarRepo: Repository<DocumentoPreliminar>,

    private readonly dataSource: DataSource,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // REGLAS DE TRANSFORMACIÓN
  // ══════════════════════════════════════════════════════════════════════════

  async findReglas(productoId?: number) {
    const where: any = { activo: true };
    if (productoId) where.producto_id = productoId;
    return this.reglaRepo.find({ where, order: { id: 'ASC' } });
  }

  async crearRegla(dto: CreateReglaTransformacionDto) {
    // Validación específica para SPLIT_FIJO
    if (dto.tipo_transformacion === 'SPLIT_FIJO') {
      if (!dto.split_items || dto.split_items.length === 0) {
        throw new BadRequestException(
          'SPLIT_FIJO requiere al menos un ítem en split_items.',
        );
      }
    }
    const regla = this.reglaRepo.create({
      producto_id: dto.producto_id,
      tipo_transformacion: dto.tipo_transformacion,
      factor: dto.factor ?? 1,
      split_items: dto.split_items ?? null,
      activo: true,
    });
    return this.reglaRepo.save(regla);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CÁLCULO Y EJECUCIÓN DE TRANSFORMACIONES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Calcula los ítems que resultarían de la transformación SIN ejecutarla.
   * Útil para mostrar un preview en el frontend antes de confirmar.
   */
  async calcularTransformacion(
    dto: EjecutarTransformacionDto,
  ): Promise<{ items_resultado: ItemResultado[]; regla: InvReglaTransformacion }> {
    const regla = await this.reglaRepo.findOne({
      where: { producto_id: dto.producto_id, activo: true },
    });
    if (!regla) {
      throw new NotFoundException(
        `No existe regla de transformación activa para el producto ${dto.producto_id}.`,
      );
    }

    const depositoDestino = dto.deposito_destino_id ?? dto.deposito_id;
    const items = this._aplicarRegla(
      regla.tipo_transformacion,
      regla.factor,
      regla.split_items,
      dto.producto_id,
      dto.cantidad_origen,
      depositoDestino,
    );

    return { items_resultado: items, regla };
  }

  /**
   * Ejecuta la transformación:
   * 1. Descuenta el producto origen del stock.
   * 2. Suma cada ítem resultado en stock (crea la fila si no existe).
   * 3. Guarda el registro en inv_transformaciones.
   */
  async ejecutarTransformacion(
    dto: EjecutarTransformacionDto,
    user: CurrentUserPayload,
  ) {
    const sucursalId = user.sucursalId;
    if (!sucursalId) {
      throw new ForbiddenException(
        'El usuario no tiene sucursal asignada. Contacte al administrador.',
      );
    }

    // Validar que el depósito pertenece a la sucursal del usuario (o es nacional)
    const deposito = await this.dataSource
      .getRepository(Almacen)
      .findOne({ where: { id: dto.deposito_id } });
    if (!deposito) {
      throw new NotFoundException(`Depósito ${dto.deposito_id} no encontrado.`);
    }
    if (!canViewAllLocations(user) && deposito.sucursal_id !== sucursalId) {
      throw new ForbiddenException(
        'No puede transformar en un depósito de otra sucursal.',
      );
    }

    const { items_resultado } = await this.calcularTransformacion(dto);

    // El correlativo se genera DENTRO de la transacción para que se revierta
    // automáticamente si la transacción falla (evita números huérfanos).
    let numeroDocumento: string;

    await this.dataSource.transaction(async (manager) => {
      // ── 0. Generar correlativos atómicos (TRF, D, C) ──────────────────
      numeroDocumento = await this._generarCorrelativoConManager(manager, sucursalId, 'TRF');
      const descargoDocumento = await this._generarCorrelativoConManager(manager, sucursalId, 'D');
      const cargoDocumento = await this._generarCorrelativoConManager(manager, sucursalId, 'C');

      // ── 1. Descontar stock origen ──────────────────────────────────────
      const stockOrigen = await manager.findOne(Stock, {
        where: {
          producto_id: dto.producto_id,
          deposito_id: dto.deposito_id,
        },
      });

      if (!stockOrigen) {
        throw new NotFoundException(
          `No hay registro de stock para el producto ${dto.producto_id} en el depósito ${dto.deposito_id}.`,
        );
      }

      const existenciaActual = Number(stockOrigen.existencia);
      if (existenciaActual < Number(dto.cantidad_origen)) {
        throw new BadRequestException(
          `Stock insuficiente. Existencia actual: ${existenciaActual}, solicitado: ${dto.cantidad_origen}.`,
        );
      }

      stockOrigen.existencia = existenciaActual - Number(dto.cantidad_origen);
      await manager.save(stockOrigen);

      // ── 2. Sumar ítems resultado ───────────────────────────────────────
      for (const item of items_resultado) {
        let stockDestino = await manager.findOne(Stock, {
          where: {
            producto_id: item.producto_id,
            deposito_id: item.deposito_id,
          },
        });
        if (stockDestino) {
          stockDestino.existencia = Number(stockDestino.existencia) + Number(item.cantidad);
        } else {
          stockDestino = manager.create(Stock, {
            producto_id: item.producto_id,
            deposito_id: item.deposito_id,
            existencia: item.cantidad,
            reservado: 0,
          });
        }
        await manager.save(stockDestino);
      }

      // ── 3. Registrar la transformación ────────────────────────────────
      const transformacion = manager.create(InvTransformacion, {
        numero_documento: numeroDocumento,
        descargo_documento: descargoDocumento,
        cargo_documento: cargoDocumento,
        sucursal_id: sucursalId,
        usuario_id: user.id,
        producto_origen_id: dto.producto_id,
        cantidad_origen: dto.cantidad_origen,
        deposito_id: dto.deposito_id,
        estado: 'CONFIRMADA',
        observacion: dto.observacion ?? null,
        items_resultado,
      });
      await manager.save(transformacion);
    });

    return this.transformacionRepo.findOne({
      where: { numero_documento: numeroDocumento! },
    });
  }

  /**
   * Ejecuta una Transformación de Inventario de Doble Módulo:
   * - Módulo 1 (Materiales a Consumir): Genera DESCARGO en depósito origen y descuenta stock.
   * - Módulo 2 (Productos Terminados): Genera CARGO en depósito destino y suma stock.
   * Ambos movimientos quedan vinculados por documento_origen = TRF-xxxxxxxx y movimiento_origen_id.
   */
  async ejecutarTransformacionDoble(
    dto: CreateTransformacionDobleDto,
    user: CurrentUserPayload,
  ) {
    if (!dto.observacion || !dto.observacion.trim()) {
      throw new BadRequestException('Es obligatorio especificar la observación o comentario de la transformación.');
    }
    if (!dto.materiales_consumir || dto.materiales_consumir.length === 0) {
      throw new BadRequestException('Debe incluir al menos un material a consumir (Módulo 1).');
    }
    if (!dto.productos_generar || dto.productos_generar.length === 0) {
      throw new BadRequestException('Debe incluir al menos un producto terminado a generar (Módulo 2).');
    }

    const sucursalId =
      dto.sucursal_id && canViewAllLocations(user)
        ? dto.sucursal_id
        : (user.sucursalId ?? 1);

    const idAlmacen = dto.deposito_id || dto.deposito_origen_id || dto.deposito_destino_id;
    if (!idAlmacen) {
      throw new BadRequestException('Debe especificar el almacén donde se realiza la transformación.');
    }
    const depositoOrigenId = dto.deposito_origen_id || idAlmacen;
    const depositoDestinoId = dto.deposito_destino_id || idAlmacen;

    // Validar que los depósitos existan
    const depositoOrigen = await this.dataSource.getRepository(Almacen).findOne({
      where: { id: depositoOrigenId },
    });
    if (!depositoOrigen) {
      throw new NotFoundException(`Almacén #${depositoOrigenId} no encontrado.`);
    }

    const depositoDestino =
      depositoDestinoId === depositoOrigenId
        ? depositoOrigen
        : await this.dataSource.getRepository(Almacen).findOne({
            where: { id: depositoDestinoId },
          });
    if (!depositoDestino) {
      throw new NotFoundException(`Almacén #${depositoDestinoId} no encontrado.`);
    }

    if (!canViewAllLocations(user)) {
      if (depositoOrigen.sucursal_id !== sucursalId || depositoDestino.sucursal_id !== sucursalId) {
        throw new ForbiddenException('No puede realizar transformaciones entre depósitos fuera de su sucursal.');
      }
    }

    let numeroTransformacion: string;
    let nuevaTransformacionId: number;

    await this.dataSource.transaction(async (manager) => {
      // 1. Generar correlativos dentro de la transacción
      numeroTransformacion = await this._generarCorrelativoConManager(manager, sucursalId, 'TRF');
      const numeroDescargo = await this._generarCorrelativoConManager(manager, sucursalId, 'D');
      const numeroCargo = await this._generarCorrelativoConManager(manager, sucursalId, 'C');

      // Calcular totales y enriquecer items
      let costoTotalConsumido = 0;
      let pesoTotalConsumido = 0;
      const materialesDetallados: ItemTransformacionDetalle[] = [];

      for (const mat of dto.materiales_consumir) {
        const prod = await manager.findOne(Producto, { where: { id: mat.producto_id } });
        if (!prod) {
          throw new NotFoundException(`Producto #${mat.producto_id} no encontrado.`);
        }
        const costoUnit = Number(mat.costo_unitario ?? prod.precio_costo ?? 0);
        const pesoUnit = Number(mat.peso_kg ?? prod.peso_kg ?? 0);
        const cantidad = Number(mat.cantidad);

        costoTotalConsumido += costoUnit * cantidad;
        pesoTotalConsumido += pesoUnit * cantidad;

        materialesDetallados.push({
          producto_id: prod.id,
          codigo: mat.codigo || prod.codigo,
          descripcion: mat.descripcion || prod.nombre,
          cantidad,
          costo_unitario: costoUnit,
          peso_kg: pesoUnit,
          unidad_medida: mat.unidad_medida || prod.unidad_medida || 'UNIDAD',
        });
      }

      let costoTotalGenerado = 0;
      let pesoTotalGenerado = 0;
      const productosDetallados: ItemTransformacionDetalle[] = [];

      for (const prodItem of dto.productos_generar) {
        const prod = await manager.findOne(Producto, { where: { id: prodItem.producto_id } });
        if (!prod) {
          throw new NotFoundException(`Producto #${prodItem.producto_id} no encontrado.`);
        }
        const costoUnit = Number(prodItem.costo_unitario ?? prod.precio_costo ?? 0);
        const pesoUnit = Number(prodItem.peso_kg ?? prod.peso_kg ?? 0);
        const cantidad = Number(prodItem.cantidad);

        costoTotalGenerado += costoUnit * cantidad;
        pesoTotalGenerado += pesoUnit * cantidad;

        productosDetallados.push({
          producto_id: prod.id,
          codigo: prodItem.codigo || prod.codigo,
          descripcion: prodItem.descripcion || prod.nombre,
          cantidad,
          costo_unitario: costoUnit,
          peso_kg: pesoUnit,
          unidad_medida: prodItem.unidad_medida || prod.unidad_medida || 'UNIDAD',
        });
      }

      // 2. Crear movimiento DESCARGO (Módulo 1)
      const descargo = manager.create(Transferencia, {
        sucursal_id: sucursalId,
        numero_documento: numeroDescargo,
        tipo_movimiento: 'DESCARGO',
        categoria: 'TRANSFORMATION_DISCHARGE',
        deposito_origen_id: depositoOrigenId,
        deposito_destino_id: undefined,
        documento_origen: numeroTransformacion,
        motivo: 'Transformación de inventario: consumo de materiales',
        observaciones: dto.observacion ? `${dto.observacion} [Origen: ${numeroTransformacion}]` : `Transformación ${numeroTransformacion}`,
        usuario_id: user.id,
        peso_total_kg: Number(pesoTotalConsumido.toFixed(3)),
        estado: 'CONFIRMADO',
      });
      const savedDescargo = await manager.save(descargo);

      // Descontar stock origen e insertar detalles descargo
      for (const mat of materialesDetallados) {
        let stock = await manager.findOne(Stock, {
          where: {
            producto_id: mat.producto_id,
            deposito_id: depositoOrigenId,
          },
        });

        if (!stock) {
          throw new NotFoundException(
            `No hay stock registrado para el material ${mat.codigo} en el almacén.`,
          );
        }

        const existenciaActual = Number(stock.existencia);
        if (existenciaActual < mat.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para el material ${mat.codigo} (${mat.descripcion}). Existencia: ${existenciaActual}, Solicitado: ${mat.cantidad}.`,
          );
        }

        stock.existencia = existenciaActual - mat.cantidad;
        await manager.save(stock);

        const detalleDescargo = manager.create(TransferenciaItem, {
          movimiento_id: savedDescargo.id,
          producto_id: mat.producto_id,
          cantidad: mat.cantidad,
          costo_unitario: mat.costo_unitario,
          peso_kg: mat.peso_kg,
          cantidad_anterior: existenciaActual,
          cantidad_posterior: stock.existencia,
        });
        await manager.save(detalleDescargo);
      }

      // 3. Crear movimiento CARGO (Módulo 2)
      const cargo = manager.create(Transferencia, {
        sucursal_id: sucursalId,
        numero_documento: numeroCargo,
        tipo_movimiento: 'CARGO',
        categoria: 'TRANSFORMATION_CHARGE',
        deposito_origen_id: undefined,
        deposito_destino_id: depositoDestinoId,
        documento_origen: numeroTransformacion,
        movimiento_origen_id: savedDescargo.id,
        motivo: 'Transformación de inventario: productos terminados',
        observaciones: dto.observacion ? `${dto.observacion} [Origen: ${numeroTransformacion}]` : `Transformación ${numeroTransformacion}`,
        usuario_id: user.id,
        peso_total_kg: Number(pesoTotalGenerado.toFixed(3)),
        estado: 'CONFIRMADO',
      });
      const savedCargo = await manager.save(cargo);

      // Sumar stock destino e insertar detalles cargo
      for (const prod of productosDetallados) {
        let stock = await manager.findOne(Stock, {
          where: {
            producto_id: prod.producto_id,
            deposito_id: depositoDestinoId,
          },
        });

        let existenciaActual = 0;
        if (stock) {
          existenciaActual = Number(stock.existencia);
          stock.existencia = existenciaActual + prod.cantidad;
        } else {
          stock = manager.create(Stock, {
            producto_id: prod.producto_id,
            deposito_id: depositoDestinoId,
            existencia: prod.cantidad,
            reservado: 0,
          });
        }
        await manager.save(stock);

        const detalleCargo = manager.create(TransferenciaItem, {
          movimiento_id: savedCargo.id,
          producto_id: prod.producto_id,
          cantidad: prod.cantidad,
          costo_unitario: prod.costo_unitario,
          peso_kg: prod.peso_kg,
          cantidad_anterior: existenciaActual,
          cantidad_posterior: stock.existencia,
        });
        await manager.save(detalleCargo);
      }

      // 4. Guardar registro en inv_transformaciones
      const transformacion = manager.create(InvTransformacion, {
        numero_documento: numeroTransformacion,
        descargo_documento: numeroDescargo,
        cargo_documento: numeroCargo,
        sucursal_id: sucursalId,
        usuario_id: user.id,
        deposito_id: depositoOrigenId,
        deposito_origen_id: depositoOrigenId,
        deposito_destino_id: depositoDestinoId,
        movimiento_descargo_id: savedDescargo.id,
        movimiento_cargo_id: savedCargo.id,
        items_consumidos: materialesDetallados,
        items_resultado: productosDetallados,
        costo_total_consumido: Number(costoTotalConsumido.toFixed(2)),
        costo_total_generado: Number(costoTotalGenerado.toFixed(2)),
        peso_total_consumido_kg: Number(pesoTotalConsumido.toFixed(3)),
        peso_total_generado_kg: Number(pesoTotalGenerado.toFixed(3)),
        observacion: dto.observacion ?? null,
        estado: 'CONFIRMADA',
      });
      const savedTransformacion = await manager.save(transformacion);
      nuevaTransformacionId = savedTransformacion.id;
    });

    return this.findOneTransformacion(nuevaTransformacionId!, user);
  }

  async findTransformaciones(user: CurrentUserPayload, query: QueryInventarioDto) {
    const qb = this.transformacionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.deposito_origen', 'deposito_origen')
      .leftJoinAndSelect('t.deposito_destino', 'deposito_destino')
      .leftJoinAndSelect('t.usuario', 'usuario')
      .orderBy('t.creado_en', 'DESC')
      .take(query.take ?? 100)
      .skip(query.skip ?? 0);

    // Filtro de sucursal
    if (canViewAllLocations(user) && query.sucursal_id) {
      qb.andWhere('t.sucursal_id = :sid', { sid: query.sucursal_id });
    } else if (!canViewAllLocations(user) && user.sucursalId) {
      qb.andWhere('t.sucursal_id = :sid', { sid: user.sucursalId });
    }

    if (query.deposito_id) {
      qb.andWhere('(t.deposito_id = :did OR t.deposito_origen_id = :did OR t.deposito_destino_id = :did)', { did: query.deposito_id });
    }
    if (query.producto_id) {
      qb.andWhere('t.producto_origen_id = :pid', { pid: query.producto_id });
    }

    return qb.getMany();
  }

  async findOneTransformacion(id: number, user: CurrentUserPayload) {
    const qb = this.transformacionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.deposito_origen', 'deposito_origen')
      .leftJoinAndSelect('t.deposito_destino', 'deposito_destino')
      .leftJoinAndSelect('t.usuario', 'usuario')
      .where('t.id = :id', { id });

    if (!canViewAllLocations(user) && user.sucursalId) {
      qb.andWhere('t.sucursal_id = :sid', { sid: user.sucursalId });
    }

    const transformacion = await qb.getOne();
    if (!transformacion) {
      throw new NotFoundException(`Transformación #${id} no encontrada.`);
    }
    return transformacion;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRELIMINARES DE INVENTARIO
  // ══════════════════════════════════════════════════════════════════════════

  async crearPreliminarInventario(
    dto: CreatePreliminarInventarioDto,
    user: CurrentUserPayload,
  ) {
    // La sucursal proviene del token salvo que el usuario sea nacional y
    // explícitamente pase otra.
    let sucursalId: number;
    if (dto.sucursal_id && canViewAllLocations(user)) {
      sucursalId = dto.sucursal_id;
    } else if (user.sucursalId) {
      sucursalId = user.sucursalId;
    } else {
      throw new ForbiddenException(
        'El usuario no tiene sucursal asignada y no se indicó una en el cuerpo.',
      );
    }

    const preliminar = this.preliminarRepo.create({
      tipo: dto.tipo as any,
      sucursal_id: sucursalId,
      usuario_id: user.id,
      etiqueta: dto.etiqueta,
      payload: dto.payload,
    });
    return this.preliminarRepo.save(preliminar);
  }

  async findPreliminaresInventario(user: CurrentUserPayload, query: QueryInventarioDto) {
    const qb = this.preliminarRepo
      .createQueryBuilder('p')
      .where("p.tipo IN ('INV_CARGO','INV_DESCARGO')")
      .orderBy('p.creado_en', 'DESC')
      .take(query.take ?? 100)
      .skip(query.skip ?? 0);

    if (canViewAllLocations(user) && query.sucursal_id) {
      qb.andWhere('p.sucursal_id = :sid', { sid: query.sucursal_id });
    } else if (!canViewAllLocations(user) && user.sucursalId) {
      qb.andWhere('p.sucursal_id = :sid', { sid: user.sucursalId });
    }

    return qb.getMany();
  }

  async findOnePreliminarInventario(id: number, user: CurrentUserPayload) {
    const preliminar = await this.preliminarRepo.findOne({ where: { id } });
    if (!preliminar) throw new NotFoundException(`Preliminar ${id} no encontrado.`);
    if (!['INV_CARGO', 'INV_DESCARGO'].includes(preliminar.tipo)) {
      throw new BadRequestException('Este preliminar no es de tipo inventario.');
    }
    if (!canViewAllLocations(user) && user.sucursalId && preliminar.sucursal_id !== user.sucursalId) {
      throw new ForbiddenException('No tiene permiso para acceder a este preliminar.');
    }
    return preliminar;
  }

  async actualizarPreliminarInventario(
    id: number,
    dto: UpdatePreliminarInventarioDto,
    user: CurrentUserPayload,
  ) {
    const preliminar = await this.findOnePreliminarInventario(id, user);

    if (dto.tipo) {
      preliminar.tipo = dto.tipo as any;
    }
    if (dto.etiqueta !== undefined) {
      preliminar.etiqueta = dto.etiqueta;
    }
    if (dto.payload !== undefined) {
      preliminar.payload = dto.payload;
    }
    if (dto.sucursal_id && canViewAllLocations(user)) {
      preliminar.sucursal_id = dto.sucursal_id;
    }

    return this.preliminarRepo.save(preliminar);
  }

  async eliminarPreliminarInventario(id: number, user: CurrentUserPayload) {
    const preliminar = await this.findOnePreliminarInventario(id, user);
    await this.preliminarRepo.remove(preliminar);
    return { success: true, id };
  }

  /**
   * Aplica un preliminar de inventario:
   * - INV_CARGO   → suma las cantidades al stock de cada ítem en el payload.
   * - INV_DESCARGO → resta las cantidades del stock.
   * Solo accesible con permiso inventario.nacional.
   */
  async aplicarPreliminar(id: number, user: CurrentUserPayload) {
    const preliminar = await this.preliminarRepo.findOne({ where: { id } });
    if (!preliminar) throw new NotFoundException(`Preliminar ${id} no encontrado.`);

    if (!['INV_CARGO', 'INV_DESCARGO'].includes(preliminar.tipo)) {
      throw new BadRequestException('Este preliminar no es de tipo inventario.');
    }

    const payload = preliminar.payload as {
      deposito_id: number;
      items: Array<{ producto_id: number; cantidad: number }>;
    };

    if (!payload?.deposito_id || !Array.isArray(payload?.items)) {
      throw new BadRequestException(
        'El payload del preliminar no tiene el formato esperado. ' +
          'Debe contener deposito_id e items: [{producto_id, cantidad}].',
      );
    }

    const esCargo = preliminar.tipo === 'INV_CARGO';

    await this.dataSource.transaction(async (manager) => {
      for (const item of payload.items) {
        let stock = await manager.findOne(Stock, {
          where: {
            producto_id: item.producto_id,
            deposito_id: payload.deposito_id,
          },
        });

        if (esCargo) {
          if (stock) {
            stock.existencia = Number(stock.existencia) + Number(item.cantidad);
          } else {
            stock = manager.create(Stock, {
              producto_id: item.producto_id,
              deposito_id: payload.deposito_id,
              existencia: item.cantidad,
              reservado: 0,
            });
          }
        } else {
          // DESCARGO
          if (!stock) {
            throw new NotFoundException(
              `No hay stock para el producto ${item.producto_id} en el depósito ${payload.deposito_id}.`,
            );
          }
          const existenciaActual = Number(stock.existencia);
          if (existenciaActual < Number(item.cantidad)) {
            throw new BadRequestException(
              `Stock insuficiente para producto ${item.producto_id}. ` +
                `Existencia: ${existenciaActual}, solicitado: ${item.cantidad}.`,
            );
          }
          stock.existencia = existenciaActual - Number(item.cantidad);
        }
        await manager.save(stock);
      }

      // Eliminar el preliminar tras aplicarlo
      await manager.remove(preliminar);
    });

    return { aplicado: true, preliminar_id: id, tipo: preliminar.tipo };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS PRIVADOS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Calcula los ítems que produce la transformación según su tipo.
   */
  private _aplicarRegla(
    tipo: TipoTransformacion,
    factor: number,
    splitItems: SplitItem[] | null,
    productoOrigenId: number,
    cantidadOrigen: number,
    depositoDestino: number,
  ): ItemResultado[] {
    const f = Number(factor);
    const q = Number(cantidadOrigen);

    switch (tipo) {
      case 'POR_METRO': {
        // Parte a la mitad: entra 1 rollo de X metros → 2 ítems de X/2
        const mitad = q / 2;
        return [
          { producto_id: productoOrigenId, cantidad: mitad, deposito_id: depositoDestino },
          { producto_id: productoOrigenId, cantidad: mitad, deposito_id: depositoDestino },
        ];
      }

      case 'ROLLO_A_METROS': {
        // 1 rollo = factor metros
        const totalMetros = q * f;
        return [
          { producto_id: productoOrigenId, cantidad: totalMetros, deposito_id: depositoDestino },
        ];
      }

      case 'TAZAS': {
        // 1 caja = factor tazas
        const totalTazas = q * f;
        return [
          { producto_id: productoOrigenId, cantidad: totalTazas, deposito_id: depositoDestino },
        ];
      }

      case 'HOJILLA_COMBO': {
        // Cada factor unidades → 1 combo (ej. 99 hojillas / 3 = 33 combos)
        const combos = Math.floor(q / f);
        if (combos === 0) {
          throw new BadRequestException(
            `La cantidad ${q} es insuficiente para formar al menos 1 combo (factor: ${f}).`,
          );
        }
        return [
          { producto_id: productoOrigenId, cantidad: combos, deposito_id: depositoDestino },
        ];
      }

      case 'SPLIT_FIJO': {
        // Los ítems de salida están definidos en split_items multiplicados por q
        if (!splitItems || splitItems.length === 0) {
          throw new BadRequestException(
            'La regla SPLIT_FIJO no tiene split_items definidos.',
          );
        }
        return splitItems.map((si) => ({
          producto_id: si.producto_id,
          cantidad: Number(si.cantidad) * q,
          deposito_id: depositoDestino,
        }));
      }

      default:
        throw new BadRequestException(`Tipo de transformación desconocido: ${tipo}`);
    }
  }

  /**
   * Incrementa el correlativo de tipo_documento DENTRO de la transacción
   * activa, de modo que si la transacción falla el número NO queda huerfano.
   * Mismo patrón que TransferenciasService y StockService.
   */
  private async _generarCorrelativoConManager(
    manager: EntityManager,
    sucursalId: number,
    codigo: string,
  ): Promise<string> {
    const fallback = `${codigo}-${Date.now()}`;
    const result: any[][] = await manager.query(
      `UPDATE tipos_documentos
         SET correlativo_actual = correlativo_actual + 1, actualizado_en = NOW()
       WHERE sucursal_id = $1 AND codigo = $2
       RETURNING correlativo_actual, longitud_formato, prefijo`,
      [sucursalId, codigo],
    );
    if (result && result[0] && result[0].length > 0) {
      const conf = result[0][0];
      const correlativoStr = String(conf.correlativo_actual).padStart(
        conf.longitud_formato,
        '0',
      );
      const prefijo = conf.prefijo ? conf.prefijo : `${codigo}-`;
      return prefijo + correlativoStr;
    }
    return fallback;
  }
}
