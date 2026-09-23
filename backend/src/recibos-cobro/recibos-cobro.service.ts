import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReciboCobro } from '../facturas/entities/recibo-cobro.entity';
import { ReciboCobroDetalle } from '../facturas/entities/recibo-cobro-detalle.entity';
import { CuentaCobrar } from '../facturas/entities/cuenta-cobrar.entity';
import { CreateReciboCobroDto } from './dto/create-recibo-cobro.dto';
import { PG_UNIQUE, pgCode } from '../common/pg-error-codes';
import { generarCorrelativoDocumento } from '../common/helpers/correlativo.helper';

@Injectable()
export class RecibosCobrosService {
  constructor(
    @InjectRepository(ReciboCobro)
    private readonly repo: Repository<ReciboCobro>,
    @InjectRepository(ReciboCobroDetalle)
    private readonly detalleRepo: Repository<ReciboCobroDetalle>,
    @InjectRepository(CuentaCobrar)
    private readonly cxcRepo: Repository<CuentaCobrar>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateReciboCobroDto): Promise<ReciboCobro> {
    return this.dataSource.transaction(async (manager) => {
      const { detalles, ...reciboData } = dto;
      try {
        const numeroRecibo = await generarCorrelativoDocumento(manager, dto.sucursal_id || 1, 'RC', 'RC-');

        const recibo = manager.create(ReciboCobro, {
          ...reciboData,
          numero_recibo: numeroRecibo,
        });
        const saved = await manager.save(recibo);

        const items = detalles.map(d =>
          manager.create(ReciboCobroDetalle, { ...d, recibo_id: saved.id }),
        );
        await manager.save(items);

        // Aplicar cada detalle a su CxC: descontar saldo_pendiente y marcar
        // PAGADO cuando llega a 0. El trigger que hacía esto se eliminó en
        // 2026-08-01_drop_trigger_recibo_saldo_cliente.sql; la responsabilidad
        // recae íntegramente en este servicio.
        for (const d of detalles) {
          // Bloqueo pesimista: sin esto, dos recibos concurrentes sobre la
          // misma CxC leen el mismo saldo_pendiente, ambos pasan la
          // validación de abajo y el segundo save() pisa al primero.
          const cxc = await manager.findOne(CuentaCobrar, {
            where: { id: d.cxc_id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!cxc) throw new NotFoundException(`CxC con ID ${d.cxc_id} no encontrada`);

          const montoAplicado = Number(d.monto_aplicado);
          const saldoActual = Number(cxc.saldo_pendiente);

          if (montoAplicado > saldoActual) {
            throw new BadRequestException(
              `El monto aplicado (${montoAplicado}) excede el saldo pendiente (${saldoActual}) de la CxC ${d.cxc_id}`,
            );
          }

          cxc.saldo_pendiente = Math.max(0, saldoActual - montoAplicado);
          if (cxc.saldo_pendiente <= 0) {
            cxc.status = 'PAGADO';
          }
          await manager.save(cxc);
        }

        return manager.findOneOrFail(ReciboCobro, { where: { id: saved.id } });
      } catch (e) {
        if (pgCode(e) === PG_UNIQUE) throw new ConflictException('Ya existe un recibo con ese número');
        throw e;
      }
    });
  }

  async findCuentasPendientes(clienteId?: number): Promise<CuentaCobrar[]> {
    const qb = this.cxcRepo
      .createQueryBuilder('cxc')
      .where('cxc.saldo_pendiente > 0')
      .andWhere("cxc.status NOT IN ('PAGADO', 'ANULADA', 'ANULADO')");

    if (clienteId) {
      qb.andWhere('cxc.cliente_id = :clienteId', { clienteId });
    }

    qb.orderBy('cxc.fecha_vencimiento', 'ASC').addOrderBy('cxc.id', 'ASC');

    return qb.getMany();
  }

  findAll(clienteId?: number, sucursalId?: number): Promise<ReciboCobro[]> {
    const where: any = {};
    if (clienteId) where.cliente_id = clienteId;
    if (sucursalId) where.sucursal_id = sucursalId;
    return this.repo.find({ where, order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<ReciboCobro> {
    const r = await this.repo.findOne({
      where: { id },
      relations: { detalles: { cxc: true } },
    });
    if (!r) throw new NotFoundException(`Recibo de cobro con ID ${id} no encontrado`);
    return r;
  }

  async findDetalles(id: number): Promise<ReciboCobroDetalle[]> {
    await this.findOne(id);
    return this.detalleRepo.find({
      where: { recibo_id: id },
      relations: { cxc: true },
    });
  }
}
