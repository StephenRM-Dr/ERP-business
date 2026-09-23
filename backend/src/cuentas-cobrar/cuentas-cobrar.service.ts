import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CuentaCobrar } from '../facturas/entities/cuenta-cobrar.entity';
import { Factura } from '../facturas/entities/factura.entity';
import { ReciboCobro } from '../facturas/entities/recibo-cobro.entity';
import { ReciboCobroDetalle } from '../facturas/entities/recibo-cobro-detalle.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { CreateCuentaCobrarDto } from './dto/create-cuenta-cobrar.dto';
import { UpdateCuentaCobrarDto } from './dto/update-cuenta-cobrar.dto';
import { CreateDocumentoCxCDto } from './dto/create-documento-cxc.dto';
import { AplicarDocumentosCxCDto } from './dto/aplicar-documentos-cxc.dto';
import { PagoDirectoCxCDto } from './dto/pago-directo-cxc.dto';
import { generarCorrelativoDocumento, getSiglaSucursal } from '../common/helpers/correlativo.helper';
import { Sucursal } from '../sucursales/entities/sucursal.entity';

const PG_FK = '23503';
const PG_RESTRICT = '23001';

export interface MovimientoCxC {
  id: string | number;
  tipo: 'FACTURA' | 'PAGO' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'ADELANTO' | 'GIRO' | 'AJUSTE' | string;
  tipoLabel: string;
  documentoNumero: string;
  documentoOrigen?: string | null;
  fecha: string | Date;
  fechaVencimiento?: string | null;
  descripcion: string;
  monedaId: number;
  tasaCambio: number;
  debito: number;   // Aumenta la deuda (+)
  credito: number;  // Disminuye la deuda (-)
  saldoPendiente: number;
  status: string;
  usuario?: string | null;
  sucursalId?: number;
  sucursalSigla?: string;
  sucursalNombre?: string;
}

export interface ResumenClienteCxC {
  cliente: {
    id: number;
    codigo: string;
    nombre: string;
    tipoDocumento: string;
    numeroDocumento: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  totales: {
    adelantos: number;
    apartados: number;
    devolucionesPendientes: number;
    debitos: number;
    creditos: number;
    saldo: number;
  };
  movimientos: MovimientoCxC[];
}

@Injectable()
export class CuentasCobrarService {
  constructor(
    @InjectRepository(CuentaCobrar)
    private readonly cuentasCobrarRepository: Repository<CuentaCobrar>,
    @InjectRepository(Factura)
    private readonly facturaRepository: Repository<Factura>,
    @InjectRepository(ReciboCobro)
    private readonly reciboRepository: Repository<ReciboCobro>,
    @InjectRepository(ReciboCobroDetalle)
    private readonly reciboDetalleRepository: Repository<ReciboCobroDetalle>,
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    private readonly dataSource: DataSource,
  ) {}

  private pgCode = (e: any) => e?.code ?? e?.driverError?.code;

  async create(dto: CreateCuentaCobrarDto): Promise<CuentaCobrar> {
    return this.cuentasCobrarRepository.save(
      this.cuentasCobrarRepository.create(dto),
    );
  }

  async findAll(clienteId?: number, status?: string): Promise<CuentaCobrar[]> {
    const qb = this.cuentasCobrarRepository
      .createQueryBuilder('cxc')
      .leftJoinAndSelect('cxc.factura', 'factura');

    if (clienteId) {
      qb.andWhere('cxc.cliente_id = :clienteId', { clienteId });
    }
    if (status && status !== 'ALL') {
      qb.andWhere('cxc.status = :status', { status });
    }

    qb.orderBy('cxc.fecha_emision', 'DESC').addOrderBy('cxc.id', 'DESC');
    return qb.getMany();
  }

  async findOne(id: number): Promise<CuentaCobrar> {
    const cxc = await this.cuentasCobrarRepository.findOne({
      where: { id },
      relations: { factura: true },
    });
    if (!cxc) {
      throw new NotFoundException(`Cuenta por cobrar con ID ${id} no encontrada`);
    }
    return cxc;
  }

  async update(id: number, dto: UpdateCuentaCobrarDto): Promise<CuentaCobrar> {
    const cxc = await this.findOne(id);
    this.cuentasCobrarRepository.merge(cxc, dto);
    return this.cuentasCobrarRepository.save(cxc);
  }

  async remove(id: number): Promise<void> {
    const cxc = await this.findOne(id);
    try {
      await this.cuentasCobrarRepository.remove(cxc);
    } catch (e) {
      if (this.pgCode(e) === PG_FK || this.pgCode(e) === PG_RESTRICT) {
        throw new ConflictException(
          'No se puede eliminar la cuenta porque tiene recibos de cobro asociados',
        );
      }
      throw e;
    }
  }

  // ─── Resumen Completo de un Cliente ──────────────────────────────────────────
  async getResumenCliente(clienteId: number): Promise<ResumenClienteCxC> {
    const cliente = await this.clienteRepository.findOne({ where: { id: clienteId } });
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${clienteId} no encontrado`);
    }

    // Cargar sucursales para mapeo de tienda y siglas
    const sucursales: Sucursal[] = (await this.dataSource.getRepository(Sucursal).find().catch(() => [])) as Sucursal[];
    const sucursalMap = new Map<number, Sucursal>();
    sucursales.forEach((s) => sucursalMap.set(s.id, s));

    // 1. Obtener todas las Cuentas por Cobrar del cliente (Facturas, ND, NC, Adelantos, etc.)
    const cxcList = await this.cuentasCobrarRepository.find({
      where: { cliente_id: clienteId },
      relations: { factura: true },
      order: { fecha_emision: 'ASC', id: 'ASC' },
    });

    // 2. Obtener todos los Recibos de Cobro del cliente con sus detalles
    const recibosList = await this.reciboRepository.find({
      where: { cliente_id: clienteId },
      relations: { detalles: { cxc: true } },
      order: { fecha_pago: 'ASC', id: 'ASC' },
    });

    // 3. Estructurar movimientos unificados
    const movimientos: MovimientoCxC[] = [];

    // Agregar cuentas por cobrar / documentos
    for (const cxc of cxcList) {
      const tipo = (cxc.tipo_documento || 'FACTURA').toUpperCase();
      const monto = Number(cxc.monto_original) || 0;
      const saldo = Number(cxc.saldo_pendiente) || 0;
      const sucId = cxc.factura?.sucursal_id || (cxc as any).sucursal_id || 1;
      const sucObj = sucursalMap.get(sucId);
      const sucSigla = getSiglaSucursal(sucObj);

      const isAnulado = cxc.status === 'ANULADO' || cxc.factura?.status === 'ANULADA';
      let debito = 0;
      let credito = 0;
      let tipoLabel = tipo;

      if (!isAnulado) {
        if (tipo === 'FACTURA') {
          debito = monto;
          tipoLabel = 'FACTURA';
        } else if (tipo === 'FACTURA_FINANCIERA' || tipo === 'FF') {
          debito = monto;
          tipoLabel = 'FACTURA FINANCIERA';
        } else if (tipo === 'NOTA_DEBITO') {
          debito = monto;
          tipoLabel = 'NOTA DE DÉBITO';
        } else if (tipo === 'GIRO') {
          debito = monto;
          tipoLabel = 'GIRO';
        } else if (tipo === 'NOTA_CREDITO' || tipo === 'DEVOLUCION') {
          credito = monto;
          tipoLabel = tipo === 'DEVOLUCION' ? 'DEVOLUCIÓN' : 'NOTA DE CRÉDITO';
        } else if (tipo === 'ADELANTO') {
          credito = monto;
          tipoLabel = 'PAGO ADELANTADO (ANTICIPO)';
        } else if (tipo === 'AJUSTE') {
          debito = monto;
          tipoLabel = 'AJUSTE';
        }
      } else {
        tipoLabel = `${tipo} (ANULADO)`;
      }

      movimientos.push({
        id: `cxc-${cxc.id}`,
        tipo,
        tipoLabel,
        documentoNumero: cxc.numero_documento || (cxc.factura ? cxc.factura.numero_factura : `DOC-${cxc.id}`),
        documentoOrigen: cxc.factura ? cxc.factura.numero_factura : null,
        fecha: cxc.fecha_emision,
        fechaVencimiento: cxc.fecha_vencimiento,
        descripcion: cxc.factura
          ? `Factura de Venta #${cxc.factura.numero_factura}${isAnulado ? ' [ANULADA]' : ''}`
          : `${tipoLabel} #${cxc.numero_documento || cxc.id}`,
        monedaId: cxc.moneda_id || 1,
        tasaCambio: Number(cxc.tasa_cambio) || 1,
        debito,
        credito,
        saldoPendiente: isAnulado ? 0 : saldo,
        status: isAnulado ? 'ANULADO' : cxc.status,
        sucursalId: sucId,
        sucursalSigla: sucSigla,
        sucursalNombre: sucObj?.nombre || `Sucursal ${sucId}`,
      });
    }

    // Agregar recibos de cobro realizados
    for (const r of recibosList) {
      const monto = Number(r.monto_total) || 0;
      const docsAplicados = r.detalles?.map(d => d.cxc?.numero_documento).filter(Boolean).join(', ');
      const sucId = r.sucursal_id || 1;
      const sucObj = sucursalMap.get(sucId);
      const sucSigla = getSiglaSucursal(sucObj);

      movimientos.push({
        id: `recibo-${r.id}`,
        tipo: 'PAGO',
        tipoLabel: 'PAGO / RECIBO DE COBRO',
        documentoNumero: r.numero_recibo,
        documentoOrigen: docsAplicados || null,
        fecha: r.fecha_pago,
        fechaVencimiento: null,
        descripcion: `Recibo de Cobro [${r.forma_pago}]${docsAplicados ? ` apl. a: ${docsAplicados}` : ''}`,
        monedaId: r.moneda_pago_id || 1,
        tasaCambio: Number(r.tasa_cambio) || 1,
        debito: 0,
        credito: monto,
        saldoPendiente: 0,
        status: 'PAGADO',
        sucursalId: sucId,
        sucursalSigla: sucSigla,
        sucursalNombre: sucObj?.nombre || `Sucursal ${sucId}`,
      });
    }

    // Ordenar cronológicamente
    movimientos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // 4. Calcular Totales
    let totalDebitos = 0;
    let totalCreditos = 0;
    let totalAdelantos = 0;
    let totalDevoluciones = 0;
    let saldoConsolidado = 0;

    for (const cxc of cxcList) {
      if (cxc.status === 'ANULADO' || cxc.factura?.status === 'ANULADA') {
        continue;
      }
      const tipo = (cxc.tipo_documento || '').toUpperCase();
      const saldo = Number(cxc.saldo_pendiente) || 0;
      const monto = Number(cxc.monto_original) || 0;

      if (['FACTURA', 'FACTURA_FINANCIERA', 'FF', 'NOTA_DEBITO', 'GIRO', 'AJUSTE'].includes(tipo)) {
        totalDebitos += monto;
        saldoConsolidado += saldo;
      } else if (tipo === 'ADELANTO') {
        if (cxc.status === 'PENDIENTE' && saldo > 0) {
          totalAdelantos += saldo;
        }
        totalCreditos += monto;
        saldoConsolidado -= saldo;
      } else if (tipo === 'NOTA_CREDITO' || tipo === 'DEVOLUCION') {
        if (cxc.status === 'PENDIENTE' && saldo > 0) {
          totalDevoluciones += saldo;
        }
        totalCreditos += monto;
        saldoConsolidado -= saldo;
      }
    }

    for (const r of recibosList) {
      totalCreditos += Number(r.monto_total) || 0;
    }

    return {
      cliente: {
        id: cliente.id,
        codigo: `${cliente.tipo_documento ? `${cliente.tipo_documento}-` : ''}${cliente.numero_documento || cliente.id}`,
        nombre: `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
        tipoDocumento: cliente.tipo_documento || 'V',
        numeroDocumento: cliente.numero_documento || '',
        direccion: (cliente as any).direccion || '',
        telefono: (cliente as any).telefono || '',
        email: cliente.email || '',
      },
      totales: {
        adelantos: Math.max(0, totalAdelantos),
        apartados: 0,
        devolucionesPendientes: Math.max(0, totalDevoluciones),
        debitos: totalDebitos,
        creditos: totalCreditos,
        saldo: Math.max(0, saldoConsolidado),
      },
      movimientos,
    };
  }

  // ─── Generación de Documentos Directos (NC, ND, Adelanto, Giro, Ajuste) ──────
  async createDocumento(dto: CreateDocumentoCxCDto): Promise<CuentaCobrar> {
    return this.dataSource.transaction(async (manager) => {
      const cliente = await manager.findOne(Cliente, { where: { id: dto.cliente_id } });
      if (!cliente) {
        throw new NotFoundException(`Cliente con ID ${dto.cliente_id} no encontrado`);
      }

      // Generar correlativo si no se proveyó uno
      let numDoc = dto.numero_documento?.trim();
      if (!numDoc) {
        const prefixMap: Record<string, string> = {
          FACTURA: 'FAC',
          FACTURA_FINANCIERA: 'FF',
          NOTA_CREDITO: 'NC',
          NOTA_DEBITO: 'ND',
          ADELANTO: 'ANT',
          GIRO: 'GIR',
          AJUSTE: 'AJU',
        };
        const prefix = prefixMap[dto.tipo_documento] || 'DOC';
        numDoc = await generarCorrelativoDocumento(manager, dto.sucursal_id || 1, prefix, `${prefix}-`);
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const vencimiento = dto.fecha_vencimiento || todayStr;

      // 1. Caso NOTA DE CRÉDITO aplicada directamente a una Factura o CxC existente
      if (dto.tipo_documento === 'NOTA_CREDITO' && (dto.cxc_id || dto.factura_id)) {
        let targetCxc: CuentaCobrar | null = null;
        if (dto.cxc_id) {
          targetCxc = await manager.findOne(CuentaCobrar, { where: { id: dto.cxc_id } });
        } else if (dto.factura_id) {
          targetCxc = await manager.findOne(CuentaCobrar, { where: { factura_id: dto.factura_id } });
        }

        if (targetCxc) {
          const saldoTarget = Number(targetCxc.saldo_pendiente) || 0;
          const montoDescuento = Math.min(dto.monto, saldoTarget);
          targetCxc.saldo_pendiente = Math.max(0, saldoTarget - montoDescuento);
          if (targetCxc.saldo_pendiente <= 0) {
            targetCxc.status = 'PAGADO';
          }
          await manager.save(targetCxc);

          // Crear registro de la NC vinculada
          const ncRecord = manager.create(CuentaCobrar, {
            cliente_id: dto.cliente_id,
            tipo_documento: 'NOTA_CREDITO',
            numero_documento: numDoc,
            factura_id: targetCxc.factura_id,
            fecha_vencimiento: vencimiento,
            monto_original: dto.monto,
            saldo_pendiente: 0, // Ya fue aplicada a la factura
            moneda_id: dto.moneda_id,
            tasa_cambio: dto.tasa_cambio || 1,
            status: 'PAGADO',
          });
          return manager.save(ncRecord);
        }
      }

      // 2. Creación general de documento (ND, Adelanto, NC a favor, Giro, Ajuste)
      const nuevoDoc = manager.create(CuentaCobrar, {
        cliente_id: dto.cliente_id,
        tipo_documento: dto.tipo_documento,
        numero_documento: numDoc,
        factura_id: dto.factura_id || undefined,
        fecha_vencimiento: vencimiento,
        monto_original: dto.monto,
        saldo_pendiente: dto.monto,
        moneda_id: dto.moneda_id,
        tasa_cambio: dto.tasa_cambio || 1,
        status: 'PENDIENTE',
      });

      return manager.save(nuevoDoc);
    });
  }

  // ─── Aplicar / Cruzar Documentos Pendientes (Anticipos / NC vs Facturas) ─────
  async aplicarDocumentos(
    dto: AplicarDocumentosCxCDto,
    usuarioId: number = 1,
    sucursalId: number = 1,
  ): Promise<{ success: boolean; mensaje: string }> {
    return this.dataSource.transaction(async (manager) => {
      const creditoCxc = await manager.findOne(CuentaCobrar, {
        where: { id: dto.credito_cxc_id, cliente_id: dto.cliente_id },
      });

      if (!creditoCxc) {
        throw new NotFoundException(`Documento de crédito con ID ${dto.credito_cxc_id} no encontrado`);
      }

      let saldoCreditoDisponible = Number(creditoCxc.saldo_pendiente) || 0;
      if (saldoCreditoDisponible <= 0) {
        throw new BadRequestException('El documento de crédito seleccionado no tiene saldo disponible');
      }

      const totalAplicar = dto.aplicaciones.reduce((sum, item) => sum + item.monto, 0);
      if (totalAplicar > saldoCreditoDisponible) {
        throw new BadRequestException(
          `El monto total a aplicar (${totalAplicar}) excede el saldo disponible del documento (${saldoCreditoDisponible})`,
        );
      }

      const resolvedUsuarioId = usuarioId || dto.usuario_id || 1;
      const resolvedSucursalId = sucursalId || dto.sucursal_id || 1;

      // Registrar el cruce como ReciboCobro para trazabilidad y reversión completa
      const reciboCruce = manager.create(ReciboCobro, {
        cliente_id: dto.cliente_id,
        sucursal_id: resolvedSucursalId,
        numero_recibo: `CRU-${Date.now().toString().slice(-8)}`,
        forma_pago: 'ANTICIPO',
        monto_total: totalAplicar,
        moneda_pago_id: creditoCxc.moneda_id || 1,
        tasa_cambio: Number(creditoCxc.tasa_cambio) || 1,
        usuario_id: resolvedUsuarioId,
        observaciones: `[CRUCE_DOCUMENTOS] Aplicación de ${creditoCxc.tipo_documento} #${creditoCxc.numero_documento} (cxcCreditoId:${creditoCxc.id})`,
      });
      const savedRecibo = await manager.save(reciboCruce);

      for (const app of dto.aplicaciones) {
        if (app.monto <= 0) continue;

        const debitoCxc = await manager.findOne(CuentaCobrar, {
          where: { id: app.debito_cxc_id, cliente_id: dto.cliente_id },
        });

        if (!debitoCxc) {
          throw new NotFoundException(`Documento débito con ID ${app.debito_cxc_id} no encontrado`);
        }

        const saldoDebito = Number(debitoCxc.saldo_pendiente) || 0;
        if (app.monto > saldoDebito) {
          throw new BadRequestException(
            `El monto aplicado (${app.monto}) excede el saldo pendiente (${saldoDebito}) del documento ${debitoCxc.numero_documento}`,
          );
        }

        debitoCxc.saldo_pendiente = Math.max(0, saldoDebito - app.monto);
        if (debitoCxc.saldo_pendiente <= 0) {
          debitoCxc.status = 'PAGADO';
        }
        await manager.save(debitoCxc);

        const detalle = manager.create(ReciboCobroDetalle, {
          recibo_id: savedRecibo.id,
          cxc_id: debitoCxc.id,
          monto_aplicado: app.monto,
        });
        await manager.save(detalle);

        saldoCreditoDisponible -= app.monto;
      }

      creditoCxc.saldo_pendiente = Math.max(0, saldoCreditoDisponible);
      if (creditoCxc.saldo_pendiente <= 0) {
        creditoCxc.status = 'PAGADO';
      }
      await manager.save(creditoCxc);

      return {
        success: true,
        mensaje: `Documentos aplicados correctamente. Saldo restante del crédito / anticipo: ${creditoCxc.saldo_pendiente.toFixed(2)}`,
      };
    });
  }

  // ─── Pago Directo desde Cuentas por Cobrar ────────────────────────────────────
  async pagoDirecto(dto: PagoDirectoCxCDto, usuarioId: number): Promise<ReciboCobro> {
    return this.dataSource.transaction(async (manager) => {
      const sucursalId = dto.sucursal_id || 1;
      const numeroRecibo = await generarCorrelativoDocumento(manager, sucursalId, 'RC', 'RC-');

      const recibo = manager.create(ReciboCobro, {
        cliente_id: dto.cliente_id,
        sucursal_id: sucursalId,
        numero_recibo: numeroRecibo,
        forma_pago: dto.forma_pago,
        monto_total: dto.monto_total,
        moneda_pago_id: dto.moneda_pago_id,
        tasa_cambio: dto.tasa_cambio || 1,
        cuenta_bancaria_id: dto.cuenta_bancaria_id || undefined,
        usuario_id: usuarioId,
        observaciones: dto.observaciones || 'Pago directo registrado en Cuentas por Cobrar',
      });
      const savedRecibo = await manager.save(recibo);

      // Aplicar detalles a cada CxC
      for (const d of dto.detalles) {
        if (d.monto_aplicado <= 0) continue;

        const cxc = await manager.findOne(CuentaCobrar, { where: { id: d.cxc_id } });
        if (!cxc) {
          throw new NotFoundException(`Cuenta por cobrar #${d.cxc_id} no encontrada`);
        }

        const saldoActual = Number(cxc.saldo_pendiente) || 0;
        cxc.saldo_pendiente = Math.max(0, saldoActual - d.monto_aplicado);
        if (cxc.saldo_pendiente <= 0) {
          cxc.status = 'PAGADO';
        }
        await manager.save(cxc);

        const detalle = manager.create(ReciboCobroDetalle, {
          recibo_id: savedRecibo.id,
          cxc_id: d.cxc_id,
          monto_aplicado: d.monto_aplicado,
        });
        await manager.save(detalle);
      }

      return savedRecibo;
    });
  }

  // ─── Anular Última Operación del Cliente ─────────────────────────────────────
  async anularUltimaOperacion(clienteId: number): Promise<{ success: boolean; mensaje: string }> {
    return this.dataSource.transaction(async (manager) => {
      // Buscar el último recibo o documento creado para este cliente
      const ultimoRecibo = await manager.findOne(ReciboCobro, {
        where: { cliente_id: clienteId },
        relations: { detalles: true },
        order: { id: 'DESC' },
      });

      const ultimoDoc = await manager.findOne(CuentaCobrar, {
        where: { cliente_id: clienteId },
        order: { id: 'DESC' },
      });

      if (!ultimoRecibo && !ultimoDoc) {
        throw new NotFoundException('No se encontraron operaciones recientes para este cliente');
      }

      // Si el último es un recibo
      if (ultimoRecibo && (!ultimoDoc || ultimoRecibo.id >= ultimoDoc.id)) {
        for (const det of ultimoRecibo.detalles || []) {
          const cxc = await manager.findOne(CuentaCobrar, { where: { id: det.cxc_id } });
          if (cxc) {
            cxc.saldo_pendiente = Number(cxc.saldo_pendiente) + Number(det.monto_aplicado);
            cxc.status = 'PENDIENTE';
            await manager.save(cxc);
          }
        }
        await manager.remove(ultimoRecibo.detalles);
        await manager.remove(ultimoRecibo);
        return { success: true, mensaje: `Recibo de Cobro #${ultimoRecibo.numero_recibo} anulado y saldos restaurados.` };
      }

      // Si el último es un documento creado en CxC (NC, ND, Adelanto, etc.)
      if (ultimoDoc && ['NOTA_CREDITO', 'NOTA_DEBITO', 'ADELANTO', 'GIRO', 'AJUSTE'].includes(ultimoDoc.tipo_documento)) {
        await manager.remove(ultimoDoc);
        return { success: true, mensaje: `Documento #${ultimoDoc.numero_documento} anulado correctamente.` };
      }

      throw new BadRequestException('La última operación no puede ser revertida automáticamente');
    });
  }

  // ─── Cruzar Devoluciones / NC Automáticamente contra Facturas Pendientes ─────
  async cruzarDevolucionesAutomatico(clienteId: number): Promise<{ success: boolean; mensaje: string; totalCruzado: number }> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Obtener todas las notas de crédito / devoluciones con saldo a favor
      const creditosPendientes = await manager.find(CuentaCobrar, {
        where: [
          { cliente_id: clienteId, tipo_documento: 'NOTA_CREDITO', status: 'PENDIENTE' },
          { cliente_id: clienteId, tipo_documento: 'DEVOLUCION', status: 'PENDIENTE' },
          { cliente_id: clienteId, tipo_documento: 'ADELANTO', status: 'PENDIENTE' },
        ],
        order: { fecha_emision: 'ASC', id: 'ASC' },
      });

      const totalCreditoDisponible = creditosPendientes.reduce((sum, c) => sum + (Number(c.saldo_pendiente) || 0), 0);
      if (creditosPendientes.length === 0 || totalCreditoDisponible <= 0) {
        return {
          success: true,
          mensaje: 'El cliente no tiene devoluciones ni notas de crédito con saldo pendiente por cruzar.',
          totalCruzado: 0,
        };
      }

      // 2. Obtener todas las facturas y notas de débito pendientes
      const debitosPendientes = await manager.find(CuentaCobrar, {
        where: [
          { cliente_id: clienteId, tipo_documento: 'FACTURA', status: 'PENDIENTE' },
          { cliente_id: clienteId, tipo_documento: 'NOTA_DEBITO', status: 'PENDIENTE' },
          { cliente_id: clienteId, tipo_documento: 'GIRO', status: 'PENDIENTE' },
        ],
        order: { fecha_emision: 'ASC', id: 'ASC' },
      });

      if (debitosPendientes.length === 0) {
        return {
          success: true,
          mensaje: `El cliente no tiene facturas pendientes. Su saldo a favor de $${totalCreditoDisponible.toFixed(2)} por devoluciones queda registrado como Saldo a Favor disponible para sus próximas compras.`,
          totalCruzado: 0,
        };
      }

      let totalCruzado = 0;
      let debitoIdx = 0;

      for (const nc of creditosPendientes) {
        let saldoNc = Number(nc.saldo_pendiente) || 0;
        if (saldoNc <= 0) continue;

        while (saldoNc > 0 && debitoIdx < debitosPendientes.length) {
          const debito = debitosPendientes[debitoIdx];
          if (!debito) break;

          const saldoDebito = Number(debito.saldo_pendiente) || 0;
          if (saldoDebito <= 0) {
            debitoIdx++;
            continue;
          }

          const montoCruzar = Math.min(saldoNc, saldoDebito);
          debito.saldo_pendiente = Math.max(0, saldoDebito - montoCruzar);
          if (debito.saldo_pendiente <= 0) {
            debito.status = 'PAGADO';
          }
          await manager.save(debito);

          saldoNc -= montoCruzar;
          totalCruzado += montoCruzar;

          if (debito.saldo_pendiente <= 0) {
            debitoIdx++;
          }
        }

        nc.saldo_pendiente = Math.max(0, saldoNc);
        if (nc.saldo_pendiente <= 0) {
          nc.status = 'PAGADO';
        }
        await manager.save(nc);

        if (debitoIdx >= debitosPendientes.length) {
          break;
        }
      }

      return {
        success: true,
        mensaje: `Se cruzaron automáticamente $${totalCruzado.toFixed(2)} de devoluciones contra facturas pendientes.`,
        totalCruzado,
      };
    });
  }

  // ─── Anular Documento Específico (Recibo, NC, ND, Anticipo, Giro, etc.) ──────
  async anularDocumentoEspecifico(tipo: string, id: number): Promise<{ success: boolean; mensaje: string }> {
    return this.dataSource.transaction(async (manager) => {
      // Caso 1: Recibo de Cobro o Pago Directo o Cruce de Documentos
      if (tipo === 'RECIBO_COBRO' || tipo === 'PAGO' || tipo === 'RECIBO') {
        const recibo = await manager.findOne(ReciboCobro, {
          where: { id },
          relations: { detalles: true },
        });
        if (!recibo) throw new NotFoundException(`Recibo #${id} no encontrado.`);

        // Si fue un CRUCE de anticipo o nota de crédito, restaurar el crédito/anticipo original
        if (recibo.observaciones && recibo.observaciones.includes('[CRUCE_DOCUMENTOS]') && recibo.observaciones.includes('cxcCreditoId:')) {
          const match = recibo.observaciones.match(/cxcCreditoId:(\d+)/);
          if (match && match[1]) {
            const creditoCxcId = Number(match[1]);
            const creditoCxc = await manager.findOne(CuentaCobrar, { where: { id: creditoCxcId } });
            if (creditoCxc) {
              creditoCxc.saldo_pendiente = Number(creditoCxc.saldo_pendiente) + Number(recibo.monto_total);
              creditoCxc.status = 'PENDIENTE';
              await manager.save(creditoCxc);
            }
          }
        }

        // Restaurar saldo de cada factura/débito aplicada en este recibo
        for (const det of recibo.detalles || []) {
          const cxc = await manager.findOne(CuentaCobrar, { where: { id: det.cxc_id } });
          if (cxc) {
            cxc.saldo_pendiente = Number(cxc.saldo_pendiente) + Number(det.monto_aplicado);
            cxc.status = 'PENDIENTE';
            await manager.save(cxc);
          }
        }

        if (recibo.detalles && recibo.detalles.length > 0) {
          await manager.remove(recibo.detalles);
        }
        await manager.remove(recibo);
        return { success: true, mensaje: `Recibo #${recibo.numero_recibo} anulado. Saldos de facturas y anticipos recuperados exitosamente.` };
      }

      // Caso 2: Documento de CuentaCobrar (NC, ND, FACTURA, ADELANTO, GIRO, etc.)
      const cxc = await manager.findOne(CuentaCobrar, { where: { id } });
      if (!cxc) throw new NotFoundException(`Documento CxC #${id} no encontrado.`);

      // Si es un ANTICIPO (ADELANTO)
      if (cxc.tipo_documento === 'ADELANTO') {
        // Revertir cruces vinculados si este anticipo fue aplicado a facturas
        const recibosCruce = await manager.find(ReciboCobro, {
          where: { cliente_id: cxc.cliente_id },
          relations: { detalles: true },
        });
        for (const rc of recibosCruce) {
          if (rc.observaciones && rc.observaciones.includes(`cxcCreditoId:${cxc.id}`)) {
            for (const det of rc.detalles || []) {
              const debCxc = await manager.findOne(CuentaCobrar, { where: { id: det.cxc_id } });
              if (debCxc) {
                debCxc.saldo_pendiente = Number(debCxc.saldo_pendiente) + Number(det.monto_aplicado);
                debCxc.status = 'PENDIENTE';
                await manager.save(debCxc);
              }
            }
            if (rc.detalles) await manager.remove(rc.detalles);
            await manager.remove(rc);
          }
        }
        await manager.remove(cxc);
        return { success: true, mensaje: `Anticipo #${cxc.numero_documento} anulado y facturas cruzadas restauradas a su saldo original.` };
      }

      // Si es una NOTA_CREDITO vinculada a una factura que fue descontada
      if (cxc.tipo_documento === 'NOTA_CREDITO' && cxc.factura_id) {
        const montoDescontado = Number(cxc.monto_original) - Number(cxc.saldo_pendiente);
        if (montoDescontado > 0) {
          const facCxc = await manager.findOne(CuentaCobrar, { where: { factura_id: cxc.factura_id } });
          if (facCxc) {
            facCxc.saldo_pendiente = Number(facCxc.saldo_pendiente) + montoDescontado;
            facCxc.status = 'PENDIENTE';
            await manager.save(facCxc);
          }
        }
      }

      await manager.remove(cxc);
      return { success: true, mensaje: `Documento #${cxc.numero_documento} (${cxc.tipo_documento}) anulado exitosamente.` };
    });
  }
}
