import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  AnularLoteDto,
  AnularIndividualDto,
  QueryDocumentosDto,
  TipoDocumentoAnulable,
} from './dto/anular-documentos.dto';
import { Factura } from '../facturas/entities/factura.entity';
import { CuentaCobrar } from '../facturas/entities/cuenta-cobrar.entity';
import { FacturaCompra } from '../compras/entities/compra.entity';
import { CuentaPagar } from '../cuentas-pagar/entities/cuenta-pagar.entity';
import { Devolucion } from '../devoluciones/entities/devolucion.entity';
import { ReciboCobro } from '../facturas/entities/recibo-cobro.entity';
import { ReciboCobroDetalle } from '../facturas/entities/recibo-cobro-detalle.entity';
import { PagoProveedor, PagoProveedorDetalle } from '../pagos-proveedores/entities/pago-proveedor.entity';
import { Transferencia } from '../transferencias/entities/transferencia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

export interface DocumentoResumenItem {
  id: number;
  tipo_documento: TipoDocumentoAnulable;
  correlativo: string;
  fecha: Date;
  tercero_nombre: string;
  moneda_id: number;
  monto_total: number;
  estado: string;
  observaciones?: string;
  es_anulable: boolean;
}

@Injectable()
export class AnulacionesService {
  constructor(private readonly dataSource: DataSource) {}

  /** Valida si el usuario es Super Admin (rolId=1) o verificó clave de admin */
  async validarClaveAdmin(
    currentUser: CurrentUserPayload,
    adminPassword?: string,
    manager?: EntityManager,
  ): Promise<void> {
    if (currentUser.rolId === 1) return;

    if (!adminPassword) {
      throw new UnauthorizedException(
        'Se requiere la clave de un administrador para anular documentos.',
      );
    }

    const em = manager || this.dataSource.manager;
    const admin = await em.findOne(Usuario, {
      where: { rol_id: 1, activo: true },
      select: { id: true, clave_hash: true },
    });

    if (!admin) {
      throw new BadRequestException('No existe un administrador activo en el sistema.');
    }

    const valida = await bcrypt.compare(adminPassword, admin.clave_hash);
    if (!valida) {
      throw new UnauthorizedException('Clave de administrador incorrecta.');
    }
  }

  /** Consulta documentos unificados para la pantalla de anulación */
  async queryDocumentos(query: QueryDocumentosDto): Promise<DocumentoResumenItem[]> {
    const { tipo_documento, sucursal_id, fecha_desde, fecha_hasta, search, solo_activos } = query;

    switch (tipo_documento) {
      case TipoDocumentoAnulable.FACTURA_VENTA: {
        // Factura no declara una relación ORM `cliente` (solo la FK cruda
        // cliente_id, a propósito — ver el comentario de findEntity en
        // productos.service.ts sobre no pedir joins que nadie necesita por
        // defecto), así que el nombre se resuelve con un join crudo, mismo
        // patrón que ya usa facturas.service.ts:273 para filtrar por cliente.
        const qb = this.dataSource
          .getRepository(Factura)
          .createQueryBuilder('f')
          .leftJoin('clientes', 'c', 'c.id = f.cliente_id')
          .addSelect('c.nombre', 'c_nombre')
          .addSelect('c.apellido', 'c_apellido')
          .orderBy('f.id', 'DESC')
          .take(150);

        if (sucursal_id) qb.andWhere('f.sucursal_id = :sucursal_id', { sucursal_id });
        if (fecha_desde) qb.andWhere('f.fecha_emision >= :fecha_desde', { fecha_desde });
        if (fecha_hasta) qb.andWhere('f.fecha_emision <= :fecha_hasta', { fecha_hasta });
        if (solo_activos) qb.andWhere('f.status != :status', { status: 'ANULADA' });
        if (search) {
          qb.andWhere(
            '(f.numero_factura ILIKE :search OR c.nombre ILIKE :search OR c.apellido ILIKE :search OR c.numero_documento ILIKE :search)',
            { search: `%${search}%` },
          );
        }

        const { entities, raw } = await qb.getRawAndEntities();
        return entities.map((f, i) => ({
          id: f.id,
          tipo_documento: TipoDocumentoAnulable.FACTURA_VENTA,
          correlativo: f.numero_factura,
          fecha: f.fecha_emision,
          tercero_nombre: raw[i]?.c_nombre
            ? `${raw[i].c_nombre} ${raw[i].c_apellido || ''}`.trim()
            : 'N/A',
          moneda_id: f.moneda_id,
          monto_total: Number(f.total_neto),
          estado: f.status,
          observaciones: f.observaciones,
          es_anulable: f.status !== 'ANULADA',
        }));
      }

      case TipoDocumentoAnulable.FACTURA_COMPRA: {
        const qb = this.dataSource
          .getRepository(FacturaCompra)
          .createQueryBuilder('c')
          .orderBy('c.id', 'DESC')
          .take(150);

        if (sucursal_id) qb.andWhere('c.sucursal_id = :sucursal_id', { sucursal_id });
        if (fecha_desde) qb.andWhere('c.fecha_emision >= :fecha_desde', { fecha_desde });
        if (fecha_hasta) qb.andWhere('c.fecha_emision <= :fecha_hasta', { fecha_hasta });
        if (solo_activos) qb.andWhere('c.status != :status', { status: 'ANULADA' });
        if (search) {
          qb.andWhere('c.numero_factura ILIKE :search', { search: `%${search}%` });
        }

        const list = await qb.getMany();
        return list.map((c) => ({
          id: c.id,
          tipo_documento: TipoDocumentoAnulable.FACTURA_COMPRA,
          correlativo: c.numero_factura,
          fecha: c.fecha_emision,
          tercero_nombre: `Proveedor #${c.proveedor_id}`,
          moneda_id: c.moneda_id,
          monto_total: Number(c.total_neto),
          estado: c.status,
          observaciones: c.observaciones,
          es_anulable: c.status !== 'ANULADA',
        }));
      }

      case TipoDocumentoAnulable.DEVOLUCION_VENTA: {
        const qb = this.dataSource
          .getRepository(Devolucion)
          .createQueryBuilder('d')
          .orderBy('d.id', 'DESC')
          .take(150);

        if (sucursal_id) qb.andWhere('d.sucursal_id = :sucursal_id', { sucursal_id });
        if (fecha_desde) qb.andWhere('d.fecha_devolucion >= :fecha_desde', { fecha_desde });
        if (fecha_hasta) qb.andWhere('d.fecha_devolucion <= :fecha_hasta', { fecha_hasta });
        if (solo_activos) qb.andWhere('d.estado != :estado', { estado: 'ANULADA' });
        if (search) {
          qb.andWhere('d.numero_devolucion ILIKE :search', { search: `%${search}%` });
        }

        const list = await qb.getMany();
        return list.map((d) => ({
          id: d.id,
          tipo_documento: TipoDocumentoAnulable.DEVOLUCION_VENTA,
          correlativo: d.numero_devolucion,
          fecha: d.fecha_devolucion,
          tercero_nombre: `Cliente #${d.cliente_id}`,
          moneda_id: d.moneda_id,
          monto_total: Number(d.total_neto),
          estado: d.estado,
          observaciones: d.motivo,
          es_anulable: d.estado !== 'ANULADA',
        }));
      }

      case TipoDocumentoAnulable.RECIBO_COBRO: {
        const qb = this.dataSource
          .getRepository(ReciboCobro)
          .createQueryBuilder('r')
          .orderBy('r.id', 'DESC')
          .take(150);

        if (sucursal_id) qb.andWhere('r.sucursal_id = :sucursal_id', { sucursal_id });
        if (fecha_desde) qb.andWhere('r.fecha_pago >= :fecha_desde', { fecha_desde });
        if (fecha_hasta) qb.andWhere('r.fecha_pago <= :fecha_hasta', { fecha_hasta });
        if (search) {
          qb.andWhere('r.numero_recibo ILIKE :search', { search: `%${search}%` });
        }

        const list = await qb.getMany();
        return list.map((r) => ({
          id: r.id,
          tipo_documento: TipoDocumentoAnulable.RECIBO_COBRO,
          correlativo: r.numero_recibo,
          fecha: r.fecha_pago,
          tercero_nombre: `Cliente #${r.cliente_id}`,
          moneda_id: r.moneda_pago_id,
          monto_total: Number(r.monto_total),
          estado: r.observaciones?.includes('[ANULADO]') ? 'ANULADA' : 'APLICADO',
          observaciones: r.observaciones,
          es_anulable: !r.observaciones?.includes('[ANULADO]'),
        }));
      }

      case TipoDocumentoAnulable.PAGO_PROVEEDOR: {
        const qb = this.dataSource
          .getRepository(PagoProveedor)
          .createQueryBuilder('p')
          .orderBy('p.id', 'DESC')
          .take(150);

        if (sucursal_id) qb.andWhere('p.sucursal_id = :sucursal_id', { sucursal_id });
        if (fecha_desde) qb.andWhere('p.fecha_pago >= :fecha_desde', { fecha_desde });
        if (fecha_hasta) qb.andWhere('p.fecha_pago <= :fecha_hasta', { fecha_hasta });
        if (search) {
          qb.andWhere('p.numero_pago ILIKE :search', { search: `%${search}%` });
        }

        const list = await qb.getMany();
        return list.map((p) => ({
          id: p.id,
          tipo_documento: TipoDocumentoAnulable.PAGO_PROVEEDOR,
          correlativo: p.numero_pago,
          fecha: p.fecha_pago,
          tercero_nombre: `Proveedor #${p.proveedor_id}`,
          moneda_id: p.moneda_pago_id,
          monto_total: Number(p.monto_total),
          estado: p.observaciones?.includes('[ANULADO]') ? 'ANULADA' : 'APLICADO',
          observaciones: p.observaciones,
          es_anulable: !p.observaciones?.includes('[ANULADO]'),
        }));
      }

      case TipoDocumentoAnulable.TRANSFERENCIA: {
        const qb = this.dataSource
          .getRepository(Transferencia)
          .createQueryBuilder('t')
          .orderBy('t.id', 'DESC')
          .take(150);

        if (sucursal_id) qb.andWhere('t.sucursal_id = :sucursal_id', { sucursal_id });
        if (fecha_desde) qb.andWhere('t.fecha_operacion >= :fecha_desde', { fecha_desde });
        if (fecha_hasta) qb.andWhere('t.fecha_operacion <= :fecha_hasta', { fecha_hasta });
        if (solo_activos) qb.andWhere('t.estado != :estado', { estado: 'ANULADA' });
        if (search) {
          qb.andWhere('t.numero_documento ILIKE :search', { search: `%${search}%` });
        }

        const list = await qb.getMany();
        return list.map((t) => ({
          id: t.id,
          tipo_documento: TipoDocumentoAnulable.TRANSFERENCIA,
          correlativo: t.numero_documento,
          fecha: t.fecha_operacion,
          tercero_nombre: `Transferencia ${t.deposito_origen_id || ''} -> ${t.deposito_destino_id || ''}`,
          moneda_id: 1,
          monto_total: 0,
          estado: t.estado || 'PROCESADA',
          observaciones: t.motivo,
          es_anulable: t.estado !== 'ANULADA',
        }));
      }

      default:
        return [];
    }
  }

  /** Anulación atómica por lote */
  async anularLote(dto: AnularLoteDto, currentUser: CurrentUserPayload) {
    if (!dto.documentos || dto.documentos.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos un documento para anular.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validar clave de administrador si no es admin
      await this.validarClaveAdmin(currentUser, dto.admin_password, queryRunner.manager);

      const resultados: Array<{ tipo: string; id: number; correlativo: string; exito: boolean }> = [];

      for (const item of dto.documentos) {
        const res = await this.ejecutarAnulacionInterna(
          item.tipo_documento,
          item.documento_id,
          dto.motivo,
          currentUser,
          queryRunner.manager,
        );
        resultados.push(res);
      }

      await queryRunner.commitTransaction();
      return {
        mensaje: `Se anularon ${resultados.length} documento(s) exitosamente.`,
        total_anulados: resultados.length,
        documentos: resultados,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /** Anulación individual */
  async anularIndividual(dto: AnularIndividualDto, currentUser: CurrentUserPayload) {
    return this.anularLote(
      {
        documentos: [{ tipo_documento: dto.tipo_documento, documento_id: dto.documento_id }],
        motivo: dto.motivo,
        admin_password: dto.admin_password,
      },
      currentUser,
    );
  }

  /** Ejecuta la anulación específica según el tipo de documento */
  private async ejecutarAnulacionInterna(
    tipo: TipoDocumentoAnulable,
    id: number,
    motivo: string,
    currentUser: CurrentUserPayload,
    manager: EntityManager,
  ): Promise<{ tipo: string; id: number; correlativo: string; exito: boolean }> {
    const stamp = `[ANULADO por ${currentUser.username} (${new Date().toISOString().slice(0, 10)})]: ${motivo}`;

    switch (tipo) {
      case TipoDocumentoAnulable.FACTURA_VENTA: {
        const fac = await manager.findOne(Factura, { where: { id } });
        if (!fac) throw new NotFoundException(`Factura con ID ${id} no encontrada.`);
        if (fac.status === 'ANULADA') {
          throw new BadRequestException(`La factura ${fac.numero_factura} ya se encuentra anulada.`);
        }
        fac.status = 'ANULADA';
        fac.observaciones = `${stamp}${fac.observaciones ? ' | ' + fac.observaciones : ''}`;
        await manager.save(fac);

        // Anular CxC asociada si existe y restaurar anticipos si fueron consumidos
        const cxc = await manager.findOne(CuentaCobrar, { where: { factura_id: id } });
        if (cxc) {
          if (cxc.status !== 'ANULADO') {
            cxc.status = 'ANULADO';
            cxc.saldo_pendiente = 0;
            await manager.save(cxc);
          }

          const detallesRecibo = await manager.find(ReciboCobroDetalle, {
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
                  const creditoDoc = await manager.findOne(CuentaCobrar, { where: { id: creditoId } });
                  if (creditoDoc) {
                    creditoDoc.saldo_pendiente = Number(creditoDoc.saldo_pendiente) + Number(det.monto_aplicado);
                    creditoDoc.status = 'PENDIENTE';
                    await manager.save(creditoDoc);
                  }
                }
              }
              det.recibo.observaciones = `${stamp} | ${obs}`;
              await manager.save(det.recibo);
            }
          }
        }

        return { tipo, id, correlativo: fac.numero_factura, exito: true };
      }

      case TipoDocumentoAnulable.FACTURA_COMPRA: {
        const com = await manager.findOne(FacturaCompra, { where: { id } });
        if (!com) throw new NotFoundException(`Compra con ID ${id} no encontrada.`);
        if (com.status === 'ANULADA') {
          throw new BadRequestException(`La compra ${com.numero_factura} ya se encuentra anulada.`);
        }
        com.status = 'ANULADA';
        com.observaciones = `${stamp}${com.observaciones ? ' | ' + com.observaciones : ''}`;
        await manager.save(com);

        // Anular CxP asociada si existe
        const cxp = await manager.findOne(CuentaPagar, { where: { compra_id: id } });
        if (cxp && cxp.status !== 'ANULADO') {
          cxp.status = 'ANULADO';
          cxp.saldo_pendiente = 0;
          await manager.save(cxp);
        }

        return { tipo, id, correlativo: com.numero_factura, exito: true };
      }

      case TipoDocumentoAnulable.DEVOLUCION_VENTA: {
        const dev = await manager.findOne(Devolucion, { where: { id } });
        if (!dev) throw new NotFoundException(`Devolución con ID ${id} no encontrada.`);
        if (dev.estado === 'ANULADA') {
          throw new BadRequestException(`La devolución ${dev.numero_devolucion} ya se encuentra anulada.`);
        }
        dev.estado = 'ANULADA';
        dev.motivo = `${stamp} | ${dev.motivo}`;
        await manager.save(dev);

        return { tipo, id, correlativo: dev.numero_devolucion, exito: true };
      }

      case TipoDocumentoAnulable.RECIBO_COBRO: {
        const rec = await manager.findOne(ReciboCobro, { where: { id } });
        if (!rec) throw new NotFoundException(`Recibo con ID ${id} no encontrado.`);
        if (rec.observaciones?.includes('[ANULADO]')) {
          throw new BadRequestException(`El recibo ${rec.numero_recibo} ya se encuentra anulado.`);
        }

        // Revertir los montos aplicados a cada CxC
        const detalles = await manager.find(ReciboCobroDetalle, { where: { recibo_id: id } });
        for (const det of detalles) {
          const cxc = await manager.findOne(CuentaCobrar, { where: { id: det.cxc_id } });
          if (cxc) {
            cxc.saldo_pendiente = Number(cxc.saldo_pendiente) + Number(det.monto_aplicado);
            cxc.status = 'PENDIENTE';
            await manager.save(cxc);
          }
        }

        rec.observaciones = `${stamp}${rec.observaciones ? ' | ' + rec.observaciones : ''}`;
        await manager.save(rec);

        return { tipo, id, correlativo: rec.numero_recibo, exito: true };
      }

      case TipoDocumentoAnulable.PAGO_PROVEEDOR: {
        const pag = await manager.findOne(PagoProveedor, { where: { id } });
        if (!pag) throw new NotFoundException(`Pago con ID ${id} no encontrado.`);
        if (pag.observaciones?.includes('[ANULADO]')) {
          throw new BadRequestException(`El pago ${pag.numero_pago} ya se encuentra anulado.`);
        }

        // Revertir los montos aplicados a cada CxP
        const detalles = await manager.find(PagoProveedorDetalle, { where: { pago_id: id } });
        for (const det of detalles) {
          const cxp = await manager.findOne(CuentaPagar, { where: { id: det.cxp_id } });
          if (cxp) {
            cxp.saldo_pendiente = Number(cxp.saldo_pendiente) + Number(det.monto_aplicado);
            cxp.status = 'PENDIENTE';
            await manager.save(cxp);
          }
        }

        pag.observaciones = `${stamp}${pag.observaciones ? ' | ' + pag.observaciones : ''}`;
        await manager.save(pag);

        return { tipo, id, correlativo: pag.numero_pago, exito: true };
      }

      case TipoDocumentoAnulable.TRANSFERENCIA: {
        const tra = await manager.findOne(Transferencia, { where: { id } });
        if (!tra) throw new NotFoundException(`Transferencia con ID ${id} no encontrada.`);
        if (tra.estado === 'ANULADA') {
          throw new BadRequestException(`La transferencia ${tra.numero_documento} ya está anulada.`);
        }
        tra.estado = 'ANULADA';
        tra.motivo = `${stamp} | ${tra.motivo}`;
        await manager.save(tra);

        return { tipo, id, correlativo: tra.numero_documento, exito: true };
      }

      default:
        throw new BadRequestException(`Tipo de documento no soportado: ${tipo}`);
    }
  }
}
