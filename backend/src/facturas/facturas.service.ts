import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { Factura } from './entities/factura.entity';
import { FacturaItem } from './entities/factura-item.entity';
import { CuentaCobrar } from './entities/cuenta-cobrar.entity';
import { ReciboCobro } from './entities/recibo-cobro.entity';
import { ReciboCobroDetalle } from './entities/recibo-cobro-detalle.entity';
import { Stock } from '../stock/entities/stock.entity';
import { Almacen } from '../almacenes/entities/almacen.entity';
import { Sucursal } from '../sucursales/entities/sucursal.entity';
import { FacturaVendedor } from './entities/factura-vendedor.entity';
import { generarCorrelativoDocumento } from '../common/helpers/correlativo.helper';

/**
 * `recibos_cobro.forma_pago` has a Postgres CHECK constraint limited to a
 * fixed Spanish vocabulary (BOLIVARES/DIVISA_USD/.../OTRO). The frontend's
 * payment methods (CASH/CARD/TRANSFER/MOBILE_PAYMENT) don't share that
 * vocabulary, so every payment must be translated before insert or the
 * constraint rejects the row with a 500.
 */
function toFormaPago(metodoPago: string, monedaPagoCodigo?: string): string {
  switch (metodoPago) {
    case 'CASH':
      if (monedaPagoCodigo === 'USD') return 'DIVISA_USD';
      if (monedaPagoCodigo === 'EUR') return 'DIVISA_EUR';
      return 'BOLIVARES';
    case 'CARD':
      return 'TARJETA_DEBITO';
    case 'TRANSFER':
    case 'MOBILE_PAYMENT':
      return 'TRANSFERENCIA';
    case 'ANTICIPO':
    case 'ADELANTO':
    case 'SALDO_A_FAVOR':
      return 'ANTICIPO';
    default:
      return 'OTRO';
  }
}

export interface FacturaListFilters {
  /** Ignored server-side unless the caller passed the 'general.viewAllLocations' check — see facturas.controller.ts. */
  sucursalId?: number;
  empresaId?: number;
  condicionPago?: 'CONTADO' | 'CREDITO';
  /** Matches numero_factura, or the customer's nombre/apellido. */
  search?: string;
  take?: number;
  skip?: number;
  vendedorIds?: number[];
  usuarioIds?: number[];
}

export interface ReporteDiarioFilters {
  fecha?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  sucursalId?: number;
  empresaId?: number;
  monedaId?: number;
  vendedorIds?: number[];
  usuarioIds?: number[];
}

export interface FormaPagoRow {
  descripcion: string;
  monto: number;
  montoDivisas: number;
  igtf: number;
  cantidad: number;
}

@Injectable()
export class FacturasService {
  constructor(
    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createFacturaDto: CreateFacturaDto,
    userId: number = 1,
    sucursalId: number = 1,
    canSellWithoutStock: boolean = false,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ── Correlativo concatenado con sigla de sucursal ──
      const isNac = !!createFacturaDto.es_nacional;
      let effectiveSucursalId = sucursalId;
      if (isNac) {
        const sucursalNac = await queryRunner.manager.findOne(Sucursal, { where: { codigo: 'NAC' } }).catch(() => null);
        if (sucursalNac) {
          effectiveSucursalId = sucursalNac.id;
        }
      }

      const numeroDoc = await generarCorrelativoDocumento(
        queryRunner.manager,
        effectiveSucursalId,
        'FAC',
        'FAC-',
        isNac,
      );

      // Calculate fecha_vencimiento from condicion_pago
      const hoy = new Date();
      let fechaVencimiento: string;
      if (
        createFacturaDto.condicion_pago === 'CREDITO' &&
        createFacturaDto.dias_credito &&
        createFacturaDto.dias_credito > 0
      ) {
        const vencimiento = new Date(hoy);
        vencimiento.setDate(
          vencimiento.getDate() + createFacturaDto.dias_credito,
        );
        fechaVencimiento = vencimiento.toISOString().split('T')[0];
      } else {
        fechaVencimiento = hoy.toISOString().split('T')[0];
      }

      const pct1 = createFacturaDto.vendedor_secundario_id ? (createFacturaDto.porcentaje_vendedor_1 ?? 50) : 100;
      const pct2 = createFacturaDto.vendedor_secundario_id ? (createFacturaDto.porcentaje_vendedor_2 ?? 50) : 0;

      const factura = queryRunner.manager.create(Factura, {
        sucursal_id: effectiveSucursalId,
        numero_factura: numeroDoc,
        cliente_id: createFacturaDto.cliente_id,
        moneda_id: createFacturaDto.moneda_id,
        tasa_cambio: createFacturaDto.tasa_cambio,
        status: 'PENDIENTE',
        total_bruto: createFacturaDto.subtotal,
        descuento_monto: createFacturaDto.descuento_monto ?? 0,
        base_imponible: createFacturaDto.base_imponible ?? createFacturaDto.subtotal,
        base_exenta: createFacturaDto.base_exenta ?? 0,
        monto_iva: createFacturaDto.monto_iva ?? 0,
        igtf_monto: createFacturaDto.igtf,
        total_neto: createFacturaDto.total,
        usuario_id: userId,
        fecha_vencimiento: fechaVencimiento,
        observaciones: createFacturaDto.observaciones ?? undefined,
        vendedor_id: createFacturaDto.vendedor_id ?? undefined,
        porcentaje_vendedor_1: pct1,
        vendedor_secundario_id: createFacturaDto.vendedor_secundario_id ?? undefined,
        porcentaje_vendedor_2: pct2,
      });

      const savedFactura = await queryRunner.manager.save(factura);

      // Guardar desglose en tabla relacional factura_vendedores
      if (createFacturaDto.vendedor_id) {
        const fv1 = queryRunner.manager.create(FacturaVendedor, {
          factura_id: savedFactura.id,
          vendedor_id: createFacturaDto.vendedor_id,
          usuario_id: userId,
          rol_en_venta: createFacturaDto.vendedor_secundario_id ? 'REDES' : 'PRINCIPAL',
          porcentaje: pct1,
          monto_comision: 0,
        });
        await queryRunner.manager.save(fv1);
      }
      if (createFacturaDto.vendedor_secundario_id) {
        const fv2 = queryRunner.manager.create(FacturaVendedor, {
          factura_id: savedFactura.id,
          vendedor_id: createFacturaDto.vendedor_secundario_id,
          usuario_id: undefined,
          rol_en_venta: 'TIENDA',
          porcentaje: pct2,
          monto_comision: 0,
        });
        await queryRunner.manager.save(fv2);
      }

      // Resolver el almacén por defecto UNA sola vez antes del loop
      let defaultDepositoId: number | null = null;
      const needsDefaultDeposito = createFacturaDto.items.some((i) => !i.deposito_id);
      if (needsDefaultDeposito) {
        const almacen = await queryRunner.manager.findOne(Almacen, {
          where: { sucursal_id: sucursalId, activo: true, permite_facturar: true },
          order: { id: 'ASC' },
        });
        defaultDepositoId = almacen?.id ?? 1;
      }

      const facturaItemsToSave: FacturaItem[] = [];

      for (const itemDto of createFacturaDto.items) {
        const depositoId = itemDto.deposito_id ?? defaultDepositoId ?? 1;

        // Validar que el depósito esté activo y permita facturar
        const depCheck = await queryRunner.manager.findOne(Almacen, { where: { id: depositoId } });
        if (depCheck && depCheck.activo === false) {
          throw new BadRequestException(
            `El depósito '${depCheck.nombre}' (${depCheck.codigo}) no está activo.`,
          );
        }
        if (depCheck && depCheck.permite_facturar === false) {
          throw new BadRequestException(
            `El depósito '${depCheck.nombre}' (${depCheck.codigo}) no está habilitado para facturar.`,
          );
        }

        // Bloqueo pesimista (FOR UPDATE) para prevenir sobreventa concurrente
        const stockActual = await queryRunner.manager.findOne(Stock, {
          where: { producto_id: itemDto.producto_id, deposito_id: depositoId },
          lock: { mode: 'pessimistic_write' },
        });

        const stockInsuficiente = !stockActual || stockActual.existencia < itemDto.cantidad;
        if (stockInsuficiente && !canSellWithoutStock) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ID ${itemDto.producto_id}. Disponible: ${stockActual?.existencia ?? 0}, Solicitado: ${itemDto.cantidad}`
          );
        }
        // canSellWithoutStock (permiso 'invoices.sellWithoutStock'): se permite
        // continuar con stock insuficiente. El trigger de BD (procesar_inventario_
        // factura_venta) descuenta igual y deja la existencia en negativo — no
        // hay validación adicional que hacer aquí, solo omitir el bloqueo.

        facturaItemsToSave.push(queryRunner.manager.create(FacturaItem, {
          factura_id: savedFactura.id,
          producto_id: itemDto.producto_id,
          deposito_id: depositoId,
          cantidad: itemDto.cantidad,
          precio_unitario: itemDto.precio_unitario,
          es_exento: itemDto.es_exento ?? false,
          impuesto_porcentaje: itemDto.impuesto_porcentaje ?? 0,
          monto_iva_linea: itemDto.monto_iva_linea ?? 0,
          neto_linea: itemDto.subtotal,
          costo_operacion: itemDto.costo_operacion ?? 0,
        }));
      }

      // Insertar todos los ítems en un solo round-trip dentro de la transacción
      await queryRunner.manager.save(facturaItemsToSave);

      // ---------------------------------------------------------
      // The DB trigger creates the CxC automatically upon insert of Factura.
      // We just need to query it here to link payments if they exist.
      // ---------------------------------------------------------
      const savedCxc = await queryRunner.manager.findOne(CuentaCobrar, {
        where: { factura_id: savedFactura.id }
      });

      if (!savedCxc) {
        throw new BadRequestException('La cuenta por cobrar no se generó automáticamente. Verifica que los Triggers de la BD estén instalados.');
      }

      if (createFacturaDto.total <= 0) {
         savedCxc.status = 'PAGADO';
         savedFactura.status = 'PAGADA';
         await queryRunner.manager.save(savedCxc);
         await queryRunner.manager.save(savedFactura);
      }

      // Process payments if provided
      if (createFacturaDto.pagos && createFacturaDto.pagos.length > 0) {
        const totalPagado = createFacturaDto.pagos.reduce(
          (sum, p) => sum + Number(p.monto),
          0,
        );

        // Create recibo_cobro for each payment method
        for (const pagoDto of createFacturaDto.pagos) {
          const isAnticipo = ['ANTICIPO', 'ADELANTO', 'SALDO_A_FAVOR'].includes((pagoDto.metodo_pago || '').toUpperCase());

          if (isAnticipo) {
            // Consumir anticipo(s) o saldos a favor del cliente
            const creditosDisponibles = await queryRunner.manager.find(CuentaCobrar, {
              where: [
                { cliente_id: createFacturaDto.cliente_id, tipo_documento: 'ADELANTO', status: 'PENDIENTE' },
                { cliente_id: createFacturaDto.cliente_id, tipo_documento: 'NOTA_CREDITO', status: 'PENDIENTE' },
                { cliente_id: createFacturaDto.cliente_id, tipo_documento: 'DEVOLUCION', status: 'PENDIENTE' },
              ],
              order: { fecha_emision: 'ASC', id: 'ASC' },
            });

            const totalCreditoDisp = creditosDisponibles.reduce((sum, c) => sum + Number(c.saldo_pendiente || 0), 0);
            if (Number(pagoDto.monto) > totalCreditoDisp + 0.009) {
              throw new BadRequestException(
                `El monto de anticipo indicado ($${Number(pagoDto.monto).toFixed(2)}) supera el saldo a favor disponible del cliente ($${totalCreditoDisp.toFixed(2)}).`,
              );
            }

            let montoPorDescontar = Number(pagoDto.monto);
            for (const cred of creditosDisponibles) {
              if (montoPorDescontar <= 0) break;
              const saldoCred = Number(cred.saldo_pendiente) || 0;
              if (saldoCred <= 0) continue;

              const aDescontar = Math.min(saldoCred, montoPorDescontar);
              cred.saldo_pendiente = Math.max(0, saldoCred - aDescontar);
              if (cred.saldo_pendiente <= 0) {
                cred.status = 'PAGADO';
              }
              await queryRunner.manager.save(cred);
              montoPorDescontar -= aDescontar;

              const numeroRecibo = 'REC-ANT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
              const recibo = queryRunner.manager.create(ReciboCobro, {
                cliente_id: createFacturaDto.cliente_id,
                sucursal_id: sucursalId,
                numero_recibo: numeroRecibo,
                forma_pago: 'ANTICIPO',
                monto_total: aDescontar,
                moneda_pago_id: createFacturaDto.moneda_id,
                tasa_cambio: createFacturaDto.tasa_cambio,
                usuario_id: userId,
                observaciones: `[CRUCE_ANTICIPO] cxcCreditoId:${cred.id} | Anticipo #${cred.numero_documento} consumido en Factura ${savedFactura.numero_factura}`,
              });
              const savedRecibo = await queryRunner.manager.save(recibo);

              const detalle = queryRunner.manager.create(ReciboCobroDetalle, {
                recibo_id: savedRecibo.id,
                cxc_id: savedCxc.id,
                monto_aplicado: aDescontar,
              });
              await queryRunner.manager.save(detalle);
            }
          } else {
            // Pago regular (Efectivo, Tarjeta, Transferencia, etc.)
            const numeroRecibo = 'REC-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
            const recibo = queryRunner.manager.create(ReciboCobro, {
              cliente_id: createFacturaDto.cliente_id,
              sucursal_id: sucursalId,
              numero_recibo: numeroRecibo,
              forma_pago: toFormaPago(pagoDto.metodo_pago, pagoDto.moneda_pago_codigo),
              monto_total: pagoDto.monto,
              moneda_pago_id: createFacturaDto.moneda_id,
              tasa_cambio: createFacturaDto.tasa_cambio,
              cuenta_bancaria_id: pagoDto.cuenta_bancaria_id ?? undefined,
              usuario_id: userId,
            });
            const savedRecibo = await queryRunner.manager.save(recibo);

            // Link payment to CxC
            const detalle = queryRunner.manager.create(ReciboCobroDetalle, {
              recibo_id: savedRecibo.id,
              cxc_id: savedCxc.id,
              monto_aplicado: pagoDto.monto,
            });
            await queryRunner.manager.save(detalle);
          }
        }

        // Update CxC saldo
        savedCxc.saldo_pendiente = Math.max(
          0,
          Number(savedCxc.monto_original) - totalPagado,
        );
        if (savedCxc.saldo_pendiente <= 0) {
          savedCxc.status = 'PAGADO';
          savedFactura.status = 'PAGADA';
        }
        await queryRunner.manager.save(savedCxc);
        await queryRunner.manager.save(savedFactura);
      }

      await queryRunner.commitTransaction();
      return this.findOne(savedFactura.id);
    } catch (err: any) {
      console.error('ERROR EN CREAR FACTURA:', err);
      await queryRunner.rollbackTransaction();
      // Re-lanzar excepciones HTTP (ej. BadRequestException de stock) tal cual
      if (err instanceof HttpException) {
        throw err;
      }
      throw new InternalServerErrorException(err.message || 'Error interno al crear factura');
    } finally {
      await queryRunner.release();
    }
  }

  /** Devuelve el próximo número de factura sin consumir el correlativo.
   *  Solo lectura — seguro de llamar múltiples veces desde el frontend.
   *  @param sucursalId  ID de la sucursal. null cuando el admin no tiene sucursal
   *                     asignada y no pasó ?sucursal_id — se responde con 404. */
  async previewCorrelativo(sucursalId: number | null, esNacional: boolean = false): Promise<{ numero: string }> {
    let targetSucursalId = sucursalId;
    let sigla = '';

    if (esNacional) {
      const sucursalNac = await this.dataSource.query(
        `SELECT id, siglas FROM sucursales WHERE codigo = 'NAC' LIMIT 1`,
      );
      if (sucursalNac && sucursalNac.length > 0) {
        targetSucursalId = sucursalNac[0].id;
        sigla = 'NAC';
      }
    } else if (sucursalId !== null) {
      const sucursal = await this.dataSource.query(
        `SELECT siglas FROM sucursales WHERE id = $1 LIMIT 1`,
        [sucursalId],
      );
      if (sucursal && sucursal.length > 0) {
        sigla = sucursal[0].siglas || '';
      }
    }

    if (targetSucursalId === null) {
      throw new NotFoundException(
        'No se puede determinar el correlativo: el usuario no tiene sucursal asignada. ' +
        'Pase ?sucursal_id en la query.',
      );
    }
    const result = await this.dataSource.query(
      `SELECT correlativo_actual, longitud_formato, prefijo
       FROM tipos_documentos
       WHERE sucursal_id = $1 AND codigo = 'FAC' AND activo = true
       LIMIT 1`,
      [targetSucursalId],
    );
    if (!result || result.length === 0) {
      throw new NotFoundException(
        `No hay tipo de documento FAC activo configurado para la sucursal ${targetSucursalId}.`,
      );
    }
    const { correlativo_actual, longitud_formato, prefijo } = result[0];
    const next = String(Number(correlativo_actual) + 1).padStart(Number(longitud_formato), '0');

    if (prefijo && prefijo.includes('-') && prefijo.split('-').length >= 3) {
      return { numero: prefijo + next };
    }
    if (sigla) {
      return { numero: `FAC-${sigla}-${next}` };
    }
    const pref = prefijo ?? 'FAC-';
    return { numero: pref + next };
  }

  async findAll(filters: FacturaListFilters = {}) {
    const {
      sucursalId,
      empresaId,
      condicionPago,
      search,
      take = 200,
      skip = 0,
      vendedorIds,
      usuarioIds,
    } = filters;

    // Query 1: IDs que cumplen los filtros, con el join a sucursales/clientes
    // solo para poder filtrar/buscar — se descarta después, así el take/skip
    // y el total salen correctos (un leftJoinAndSelect de items acá
    // multiplicaría filas y rompería el conteo). getCount() y getRawMany()
    // usan cada uno su PROPIO query builder — reusar el mismo entre ambos
    // hace que TypeORM descarte el take/skip ya aplicado y devuelva todo.
    const buildIdQuery = () => {
      const qb = this.facturasRepository
        .createQueryBuilder('factura')
        .select('factura.id', 'id')
        .leftJoin('sucursales', 'sucursal', 'sucursal.id = factura.sucursal_id')
        .leftJoin('clientes', 'cliente', 'cliente.id = factura.cliente_id');

      if (sucursalId) {
        qb.andWhere('factura.sucursal_id = :sucursalId', { sucursalId });
      }
      if (empresaId) {
        qb.andWhere('sucursal.empresa_id = :empresaId', { empresaId });
      }
      if (condicionPago === 'CONTADO') {
        qb.andWhere('factura.fecha_vencimiento <= factura.fecha_emision::date');
      } else if (condicionPago === 'CREDITO') {
        qb.andWhere('factura.fecha_vencimiento > factura.fecha_emision::date');
      }
      if (vendedorIds && vendedorIds.length > 0) {
        qb.andWhere(
          '(factura.vendedor_id IN (:...vendedorIds) OR factura.vendedor_secundario_id IN (:...vendedorIds))',
          { vendedorIds },
        );
      }
      if (usuarioIds && usuarioIds.length > 0) {
        qb.andWhere('factura.usuario_id IN (:...usuarioIds)', { usuarioIds });
      }
      if (search && search.trim() !== '') {
        qb.andWhere(
          '(factura.numero_factura ILIKE :search OR cliente.nombre ILIKE :search OR cliente.apellido ILIKE :search)',
          { search: `%${search.trim()}%` },
        );
      }
      return qb;
    };

    const total = await buildIdQuery().getCount();
    // .limit()/.offset() (raw SQL LIMIT/OFFSET), not .take()/.skip(): with a
    // leftJoin present, TypeORM's take/skip switches to "smart" join-aware
    // pagination (wraps the query to dedupe rows a one-to-many join could
    // multiply) — that mode ignores a custom .select() override and was
    // silently returning every row regardless of take/skip.
    const idRows = await buildIdQuery()
      .orderBy('factura.id', 'DESC')
      .limit(take)
      .offset(skip)
      .getRawMany<{ id: number }>();
    const ids = idRows.map((row) => row.id);

    if (ids.length === 0) {
      return { data: [], total };
    }

    // Query 2: facturas con items (relación directa, sin problemas), ya
    // acotadas a los IDs de la página actual.
    const facturas = await this.facturasRepository.find({
      where: { id: In(ids) },
      order: { id: 'DESC' },
      relations: {
        items: true,
        usuario: true,
        vendedor: true,
        vendedor_secundario: true,
      },
    });

    // Query 3: CxC con sus pagos, por separado para evitar el bug de TypeORM
    // con múltiples OneToMany anidadas en un solo find()
    const facturaIds = facturas.map((f) => f.id);
    let cxcMap = new Map<number, CuentaCobrar>();

    if (facturaIds.length > 0) {
      const cxcList = await this.dataSource.getRepository(CuentaCobrar).find({
        where: facturaIds.map((fid) => ({ factura_id: fid })),
        relations: { recibosDetalles: { recibo: true } },
      });
      for (const cxc of cxcList) {
        if (cxc.factura_id) {
          cxcMap.set(cxc.factura_id, cxc);
        }
      }
    }

    // Mergear antes de mapear
    for (const f of facturas) {
      (f as any).cxc = cxcMap.get(f.id) || null;
    }

    return { data: facturas.map((f) => this.mapToFrontendFormat(f)), total };
  }

  async findOne(id: number) {
    const factura = await this.facturasRepository.findOne({
      where: { id },
      relations: {
        items: true,
        cxc: { recibosDetalles: { recibo: true } },
        usuario: true,
        vendedor: true,
        vendedor_secundario: true,
      },
    });
    if (!factura)
      throw new NotFoundException(`Factura con ID ${id} no encontrada`);
    return this.mapToFrontendFormat(factura);
  }

  async anular(id: number, motivo?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const factura = await queryRunner.manager.findOne(Factura, { where: { id } });
      if (!factura) throw new NotFoundException(`Factura con ID ${id} no encontrada`);
      if (factura.status === 'ANULADA') {
        throw new BadRequestException('La factura ya está anulada');
      }
      factura.status = 'ANULADA';
      if (motivo) {
        factura.observaciones = `[ANULADA] ${motivo}${factura.observaciones ? '\n' + factura.observaciones : ''}`;
      }
      await queryRunner.manager.save(factura);

      // ── 1. Anular Cuenta por Cobrar directa de la Factura ──
      const cxcList = await queryRunner.manager.find(CuentaCobrar, { where: { factura_id: id } });
      for (const cxc of cxcList) {
        if (cxc.status !== 'ANULADO') {
          cxc.status = 'ANULADO';
          cxc.saldo_pendiente = 0;
          await queryRunner.manager.save(cxc);
        }

        // ── 2. Restaurar Anticipos / Saldos a favor consumidos en esta Factura ──
        const detallesRecibo = await queryRunner.manager.find(ReciboCobroDetalle, {
          where: { cxc_id: cxc.id },
          relations: { recibo: true },
        });

        for (const det of detallesRecibo) {
          if (det.recibo) {
            const obs = det.recibo.observaciones || '';
            if (obs.includes('[CRUCE_ANTICIPO]') || obs.includes('[CRUCE_DOCUMENTOS]')) {
              const match = obs.match(/cxcCreditoId:(\d+)/);
              if (match && match[1]) {
                const creditoId = Number(match[1]);
                const creditoDoc = await queryRunner.manager.findOne(CuentaCobrar, { where: { id: creditoId } });
                if (creditoDoc) {
                  creditoDoc.saldo_pendiente = Number(creditoDoc.saldo_pendiente) + Number(det.monto_aplicado);
                  creditoDoc.status = 'PENDIENTE';
                  await queryRunner.manager.save(creditoDoc);
                }
              }
            }
            det.recibo.observaciones = `[ANULADO por anulación de Factura #${factura.numero_factura}] ${obs}`;
            await queryRunner.manager.save(det.recibo);
          }
        }
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getReporteDiario(filters: ReporteDiarioFilters) {
    const { fecha, fechaDesde, fechaHasta, sucursalId, empresaId, monedaId, vendedorIds, usuarioIds } = filters;

    const qb = this.facturasRepository
      .createQueryBuilder('factura')
      .leftJoinAndSelect('factura.cliente', 'cliente')
      .leftJoinAndSelect('factura.usuario', 'usuario')
      .leftJoinAndSelect('factura.vendedor', 'vendedor')
      .leftJoin('sucursales', 'sucursal', 'sucursal.id = factura.sucursal_id');

    if (fechaDesde && fechaHasta) {
      qb.andWhere('factura.fecha_emision::date >= :fechaDesde AND factura.fecha_emision::date <= :fechaHasta', {
        fechaDesde,
        fechaHasta,
      });
    } else if (fecha) {
      qb.andWhere('factura.fecha_emision::date = :fecha', { fecha });
    }

    if (sucursalId) {
      qb.andWhere('factura.sucursal_id = :sucursalId', { sucursalId });
    }
    if (empresaId) {
      qb.andWhere('sucursal.empresa_id = :empresaId', { empresaId });
    }
    if (monedaId) {
      qb.andWhere('factura.moneda_id = :monedaId', { monedaId });
    }
    if (vendedorIds && vendedorIds.length > 0) {
      qb.andWhere(
        '(factura.vendedor_id IN (:...vendedorIds) OR factura.vendedor_secundario_id IN (:...vendedorIds))',
        { vendedorIds },
      );
    }
    if (usuarioIds && usuarioIds.length > 0) {
      qb.andWhere('factura.usuario_id IN (:...usuarioIds)', { usuarioIds });
    }

    qb.orderBy('factura.id', 'ASC');

    const facturas = await qb.getMany();

    // CxC y pagos vinculados a estas facturas
    const facturaIds = facturas.map((f) => f.id);
    const cxcMap = new Map<number, CuentaCobrar>();
    if (facturaIds.length > 0) {
      const cxcList = await this.dataSource.getRepository(CuentaCobrar).find({
        where: facturaIds.map((fid) => ({ factura_id: fid })),
        relations: { recibosDetalles: { recibo: true } },
      });
      for (const cxc of cxcList) {
        if (cxc.factura_id) {
          cxcMap.set(cxc.factura_id, cxc);
        }
      }
    }

    // Recibos de cobro de CxC registrados en la misma fecha
    const recibosQb = this.dataSource
      .getRepository(ReciboCobro)
      .createQueryBuilder('recibo')
      .leftJoinAndSelect('recibo.detalles', 'detalles')
      .leftJoin('detalles.cxc', 'cxc')
      .leftJoin('sucursales', 'sucursal', 'sucursal.id = recibo.sucursal_id');

    if (fechaDesde && fechaHasta) {
      recibosQb.andWhere('recibo.fecha_pago::date >= :fechaDesde AND recibo.fecha_pago::date <= :fechaHasta', {
        fechaDesde,
        fechaHasta,
      });
    } else if (fecha) {
      recibosQb.andWhere('recibo.fecha_pago::date = :fecha', { fecha });
    }

    if (sucursalId) {
      recibosQb.andWhere('recibo.sucursal_id = :sucursalId', { sucursalId });
    }
    if (empresaId) {
      recibosQb.andWhere('sucursal.empresa_id = :empresaId', { empresaId });
    }
    if (usuarioIds && usuarioIds.length > 0) {
      recibosQb.andWhere('recibo.usuario_id IN (:...usuarioIds)', { usuarioIds });
    }

    const recibosDelDia = await recibosQb.getMany();

    // ── 1. Cálculos de Facturación ──
    let totalVentasBrutas = 0;
    let totalDescuentos = 0;
    let totalIva = 0;
    let totalIgtf = 0;
    let totalContado = 0;
    let totalCredito = 0;
    let totalGravable = 0;
    let totalExento = 0;

    const transacciones = facturas.map((f) => {
      const isAnulada = f.status === 'ANULADA';
      const fEmision = new Date(f.fecha_emision);
      const fVencimiento = new Date(f.fecha_vencimiento);
      const diffDays = Math.round(
        (fVencimiento.getTime() - fEmision.getTime()) / (1000 * 60 * 60 * 24),
      );
      const isContado = diffDays <= 0;

      const subtotal = Number(f.total_bruto || 0);
      const descuento = Number(f.descuento_monto || 0);
      const baseImp = Number(f.base_imponible || 0);
      const baseEx = Number(f.base_exenta || 0);
      const montoIva = Number(f.monto_iva || 0);
      const montoIgtf = Number(f.igtf_monto || 0);
      const totalNeto = Number(f.total_neto || 0);

      // Monto Neto = (Base Imponible + Base Exenta) - Descuento (o Base Imponible - Descuento)
      const baseTotal = (baseImp + baseEx) > 0 ? (baseImp + baseEx) : subtotal;
      const montoNeto = isAnulada ? 0 : Math.max(0, baseTotal - descuento);
      const impuestos = isAnulada ? 0 : (montoIva + montoIgtf);
      const contado = isAnulada || !isContado ? 0 : totalNeto;
      const credito = isAnulada || isContado ? 0 : totalNeto;

      if (!isAnulada) {
        totalVentasBrutas += subtotal;
        totalDescuentos += descuento;
        totalIva += montoIva;
        totalIgtf += montoIgtf;
        totalGravable += baseImp;
        totalExento += baseEx;
        if (isContado) {
          totalContado += totalNeto;
        } else {
          totalCredito += totalNeto;
        }
      }

      let descripcion = '';
      if (isAnulada) {
        const doc = f.cliente ? `${f.cliente.tipo_documento || 'J'}-${f.cliente.numero_documento || '00000000'}` : 'J-00000000';
        descripcion = `${doc}-****ANULADO****`;
      } else if (f.cliente) {
        const doc = `${f.cliente.tipo_documento || 'V'}-${f.cliente.numero_documento || ''}`;
        const nombre = `${f.cliente.nombre || ''} ${f.cliente.apellido || ''}`.trim();
        descripcion = doc ? `${doc}-${nombre}` : nombre;
      } else {
        descripcion = 'CLIENTE GENERAL';
      }

      return {
        id: f.id,
        documento: f.numero_factura,
        numeroControl: f.numero_control,
        descripcion,
        montoNeto,
        impuestos,
        contado,
        credito,
        totalNeto,
        status: f.status,
        condicion: isContado ? 'CONTADO' : 'CREDITO',
        fechaEmision: f.fecha_emision,
        fechaVencimiento: f.fecha_vencimiento,
      };
    });

    // ── 2. Desglose de Formas de Pago ──
    const formasMap = new Map<string, FormaPagoRow>();

    const registrarPago = (formaPagoStr: string, monto: number, tasa: number, igtf: number) => {
      const fp = (formaPagoStr || 'OTRO').toUpperCase();
      let label = 'Otras Formas de Pago';
      let factorDivisa = tasa && tasa > 0 ? tasa : 1;

      if (fp.includes('USD') || fp === 'DOLARES' || fp === 'DIVISA_USD' || fp === 'EFECTIVO_USD') {
        label = 'Dolares';
        factorDivisa = 1;
      } else if (fp.includes('COP') || fp.includes('PESO')) {
        label = 'Pesos';
        factorDivisa = tasa > 0 ? tasa : 3200;
      } else if (fp.includes('BANCOLOMBIA')) {
        label = 'Bancolombia';
        factorDivisa = tasa > 0 ? tasa : 3200;
      } else if (fp.includes('ZELLE')) {
        label = 'Zelle';
        factorDivisa = 1;
      } else if (fp.includes('BINANCE') || fp.includes('CRYPTO') || fp.includes('USDT')) {
        label = 'BINANCE';
        factorDivisa = 1;
      } else if (fp.includes('CHEQUE')) {
        label = 'Cheques';
      } else if (fp.includes('PUNTO') || fp.includes('TARJETA') || fp.includes('DEBITO')) {
        label = 'Tarjeta / Punto de Venta (Bs)';
        factorDivisa = tasa > 0 ? tasa : 1;
      } else if (fp.includes('PAGO_MOVIL') || fp.includes('TRANSFERENCIA') || fp.includes('BOLIVARES')) {
        label = 'Bolívares (Transf / Pago Móvil)';
        factorDivisa = tasa > 0 ? tasa : 1;
      } else {
        label = formaPagoStr || 'Otras Formas';
      }

      const existing = formasMap.get(label) || {
        descripcion: label,
        monto: 0,
        montoDivisas: 0,
        igtf: 0,
        cantidad: 0,
      };

      existing.monto += monto;
      existing.montoDivisas += (factorDivisa !== 1 ? (monto * factorDivisa) : monto);
      existing.igtf += igtf;
      existing.cantidad += 1;
      formasMap.set(label, existing);
    };

    // Agregar pagos de facturas de contado del día
    for (const f of facturas) {
      if (f.status === 'ANULADA') continue;
      const cxc = cxcMap.get(f.id);
      if (cxc && cxc.recibosDetalles) {
        for (const d of cxc.recibosDetalles) {
          if (d.recibo) {
            const r = d.recibo;
            registrarPago(
              r.forma_pago,
              Number(d.monto_aplicado || r.monto_total || 0),
              Number(r.tasa_cambio || f.tasa_cambio || 1),
              Number(r.igtf_monto || 0),
            );
          }
        }
      }
    }

    // Agregar también pagos recibidos directamente en CxC hoy
    let totalEfectivoCxc = 0;
    let totalOtrasFormasCxc = 0;
    let montoTotalPagosRecibidos = 0;
    const cxcFacturasIdsAfectadas = new Set<number>();

    for (const r of recibosDelDia) {
      const montoR = Number(r.monto_total || 0);
      montoTotalPagosRecibidos += montoR;
      const fp = (r.forma_pago || '').toUpperCase();
      const isEfectivo = fp.includes('CASH') || fp.includes('EFECTIVO') || fp === 'DIVISA_USD' || fp === 'BOLIVARES';

      if (isEfectivo) {
        totalEfectivoCxc += montoR;
      } else {
        totalOtrasFormasCxc += montoR;
      }

      if (r.detalles) {
        for (const d of r.detalles) {
          if (d.cxc_id) cxcFacturasIdsAfectadas.add(d.cxc_id);
        }
      }
    }

    // Calcular desglose de totales de pago
    let totalEfectivo = 0;
    let totalNumeroCheques = 0;
    let totalCheques = 0;
    let totalOtrasFormasPago = 0;

    for (const [desc, row] of formasMap.entries()) {
      if (desc.toLowerCase().includes('cheque')) {
        totalNumeroCheques += row.cantidad;
        totalCheques += row.monto;
      } else if (desc === 'Dolares' || desc.toLowerCase().includes('efectivo')) {
        totalEfectivo += row.monto;
      } else {
        totalOtrasFormasPago += row.monto;
      }
    }

    // Si no hubo pagos desglosados en recibos para contado, asumir total_contado en Otras/Efectivo
    if (formasMap.size === 0 && totalContado > 0) {
      totalOtrasFormasPago = totalContado;
    }

    const totalIngresos = totalContado;

    return {
      fecha,
      moneda: monedaId ? 'Divisa' : 'Dólares',
      empresa: 'ERP BUSINESS, C.A.',
      cierreOperaciones: {
        totalVentasBrutas,
        totalDescuentos,
        totalIva,
        totalIgtf,
        totalContado,
        totalCredito,
        totalTransacciones: facturas.length,
        totalGravable,
        totalExento,
        totalEfectivo,
        totalNumeroCheques,
        totalCheques,
        totalOtrasFormasPago,
        totalIngresos,
      },
      operacionesCxC: {
        numeroFacturas: cxcFacturasIdsAfectadas.size,
        numeroPagosRecibidos: recibosDelDia.length,
        montoPagosRecibidos: montoTotalPagosRecibidos,
        totalEfectivo: totalEfectivoCxc,
        totalOtrasFormasPago: totalOtrasFormasCxc,
        totalIngresos: montoTotalPagosRecibidos,
      },
      transacciones,
      otrasFormasPagoDetalle: Array.from(formasMap.values()),
    };
  }

  private mapToFrontendFormat(f: Factura) {
    // Derive payment condition from dates
    const fechaEmision = new Date(f.fecha_emision);
    const fechaVencimiento = new Date(f.fecha_vencimiento);
    const diffDays = Math.round(
      (fechaVencimiento.getTime() - fechaEmision.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      id: f.id,
      sucursal_id: f.sucursal_id,
      correlativo: f.numero_factura,
      numero_control: f.numero_control,
      cliente_id: f.cliente_id,
      moneda: f.moneda_id,
      tasa_cambio: f.tasa_cambio,
      subtotal: f.total_bruto,
      descuento_monto: f.descuento_monto ?? 0,
      base_imponible: f.base_imponible,
      base_exenta: f.base_exenta,
      monto_iva: f.monto_iva,
      igtf: f.igtf_monto,
      total: f.total_neto,
      condicion_pago: diffDays <= 0 ? 'CONTADO' : 'CREDITO',
      dias_credito: diffDays > 0 ? diffDays : 0,
      estado: f.status === 'PAGADA' ? 'EMITIDA' : f.status,
      fecha_emision: f.fecha_emision,
      fecha_vencimiento: f.fecha_vencimiento,
      observaciones: f.observaciones,
      usuario_id: f.usuario_id,
      usuario_nombre: f.usuario?.nombre_completo || f.usuario?.username || null,
      vendedor_id: f.vendedor_id ?? null,
      vendedor_nombre: f.vendedor?.nombre || null,
      porcentaje_vendedor_1: Number(f.porcentaje_vendedor_1 ?? 100),
      vendedor_secundario_id: f.vendedor_secundario_id ?? null,
      vendedor_secundario_nombre: f.vendedor_secundario?.nombre || null,
      porcentaje_vendedor_2: Number(f.porcentaje_vendedor_2 ?? 0),
      items: f.items?.map((item) => ({
        id: item.id,
        producto_id: item.producto_id,
        deposito_id: item.deposito_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        es_exento: item.es_exento,
        impuesto_porcentaje: item.impuesto_porcentaje,
        monto_iva_linea: item.monto_iva_linea,
        subtotal: item.neto_linea,
      })) || [],
      pagos: f.cxc?.recibosDetalles?.map((detalle) => ({
        id: detalle.recibo.id,
        metodo_pago: detalle.recibo.forma_pago,
        moneda_pago_id: detalle.recibo.moneda_pago_id,
        monto: detalle.monto_aplicado,
        cuenta_bancaria_id: detalle.recibo.cuenta_bancaria_id,
      })) || [],
    };
  }
}
