import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PagoProveedor, PagoProveedorDetalle } from './entities/pago-proveedor.entity';
import { CuentaPagar } from '../cuentas-pagar/entities/cuenta-pagar.entity';
import { CreatePagoProveedorDto } from './dto/create-pago-proveedor.dto';
import { PG_UNIQUE, pgCode } from '../common/pg-error-codes';

@Injectable()
export class PagosProveedoresService {
  constructor(
    @InjectRepository(PagoProveedor)
    private readonly repo: Repository<PagoProveedor>,
    @InjectRepository(PagoProveedorDetalle)
    private readonly detalleRepo: Repository<PagoProveedorDetalle>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePagoProveedorDto): Promise<PagoProveedor> {
    return this.dataSource.transaction(async (manager) => {
      const { detalles, ...pagoData } = dto;
      try {
        const pago = manager.create(PagoProveedor, pagoData);
        const saved = await manager.save(pago);

        const items = detalles.map(d =>
          manager.create(PagoProveedorDetalle, { ...d, pago_id: saved.id }),
        );
        await manager.save(items);

        // Aplicar cada detalle a su CxP: descontar saldo_pendiente y marcar
        // PAGADO cuando llega a 0. Simétrico al flujo de recibos-cobro / CxC.
        for (const d of detalles) {
          // Bloqueo pesimista: mismo motivo que en recibos-cobro.service.ts —
          // evita que dos pagos concurrentes lean el mismo saldo_pendiente.
          const cxp = await manager.findOne(CuentaPagar, {
            where: { id: d.cxp_id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!cxp) throw new NotFoundException(`CxP con ID ${d.cxp_id} no encontrada`);

          const montoAplicado = Number(d.monto_aplicado);
          const saldoActual = Number(cxp.saldo_pendiente);

          if (montoAplicado > saldoActual) {
            throw new BadRequestException(
              `El monto aplicado (${montoAplicado}) excede el saldo pendiente (${saldoActual}) de la CxP ${d.cxp_id}`,
            );
          }

          cxp.saldo_pendiente = Math.max(0, saldoActual - montoAplicado);
          if (cxp.saldo_pendiente <= 0) {
            cxp.status = 'PAGADO';
          }
          await manager.save(cxp);
        }

        // Decrementar saldo_actual del proveedor.
        // Antes lo hacía fn_trg_pago_saldo_proveedor (eliminado en
        // 2026-08-27_drop_trigger_pago_proveedor.sql).
        await manager.query(
          `UPDATE proveedores SET saldo_actual = saldo_actual - $1 WHERE id = $2`,
          [Number(saved.monto_total), saved.proveedor_id],
        );

        return manager.findOneOrFail(PagoProveedor, { where: { id: saved.id } });
      } catch (e) {
        if (pgCode(e) === PG_UNIQUE) throw new ConflictException('Ya existe un pago con ese número');
        throw e;
      }
    });
  }

  findAll(proveedorId?: number, sucursalId?: number): Promise<PagoProveedor[]> {
    const where: any = {};
    if (proveedorId) where.proveedor_id = proveedorId;
    if (sucursalId) where.sucursal_id = sucursalId;
    return this.repo.find({ where, order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<PagoProveedor> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Pago de proveedor con ID ${id} no encontrado`);
    return p;
  }

  async findDetalles(id: number): Promise<PagoProveedorDetalle[]> {
    await this.findOne(id);
    return this.detalleRepo.find({ where: { pago_id: id } });
  }
}
