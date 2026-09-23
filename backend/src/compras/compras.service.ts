import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FacturaCompra, FacturaCompraDetalle } from './entities/compra.entity';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';
import { CuentaPagar } from '../cuentas-pagar/entities/cuenta-pagar.entity';

const PG_UNIQUE = '23505';
const PG_FK = '23503';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(FacturaCompra)
    private readonly compraRepo: Repository<FacturaCompra>,
    @InjectRepository(FacturaCompraDetalle)
    private readonly detalleRepo: Repository<FacturaCompraDetalle>,
    @InjectRepository(CuentaPagar)
    private readonly cxpRepo: Repository<CuentaPagar>,
    private readonly dataSource: DataSource,
  ) {}

  private pgCode = (e: any) => e?.code ?? e?.driverError?.code;

  async create(dto: CreateCompraDto): Promise<FacturaCompra> {
    return this.dataSource.transaction(async (manager) => {
      const { detalles, ...compraData } = dto;
      try {
        const compra = manager.create(FacturaCompra, compraData);
        const saved = await manager.save(compra);
        // NOTA: el incremento de inventario_stock.existencia lo maneja el trigger
        // trg_compra_detalle_stock (fn_trg_compra_actualizar_stock) en la DB.
        // ComprasService no toca stock directamente — es intencional.
        const items = detalles.map(d => manager.create(FacturaCompraDetalle, { ...d, compra_id: saved.id }));
        await manager.save(items);

        // Auto-generar cuenta por pagar ligada a esta compra.
        // Si la factura es a crédito (fecha_vencimiento > fecha_emision) queda
        // PENDIENTE; de lo contrario también — el pago se registra luego con
        // PagosProveedoresModule que descuenta el saldo_pendiente.
        const cxp = manager.create(CuentaPagar, {
          proveedor_id: saved.proveedor_id,
          tipo_documento: 'FACTURA',
          numero_documento: saved.numero_factura,
          compra_id: saved.id,
          fecha_vencimiento: saved.fecha_vencimiento,
          monto_original: Number(saved.total_neto),
          saldo_pendiente: Number(saved.total_neto),
          moneda_id: saved.moneda_id,
          tasa_cambio: Number(saved.tasa_cambio),
          status: 'PENDIENTE',
        });
        await manager.save(cxp);

        // Incrementar saldo_actual del proveedor.
        // Antes lo hacía fn_trg_compra_generar_cxp (eliminado en
        // 2026-08-27_drop_trigger_compra_cxp.sql).
        await manager.query(
          `UPDATE proveedores SET saldo_actual = saldo_actual + $1 WHERE id = $2`,
          [Number(saved.total_neto), saved.proveedor_id],
        );

        return manager.findOneOrFail(FacturaCompra, { where: { id: saved.id } });
      } catch (e) {
        if (this.pgCode(e) === PG_UNIQUE) throw new ConflictException('Ya existe una factura con ese número para ese proveedor');
        throw e;
      }
    });
  }

  findAll(proveedorId?: number, sucursalId?: number): Promise<FacturaCompra[]> {
    const where: any = {};
    if (proveedorId) where.proveedor_id = proveedorId;
    if (sucursalId) where.sucursal_id = sucursalId;
    return this.compraRepo.find({ where, order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<FacturaCompra> {
    const c = await this.compraRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Compra con ID ${id} no encontrada`);
    return c;
  }

  async update(id: number, dto: UpdateCompraDto): Promise<FacturaCompra> {
    const c = await this.findOne(id);
    if (c.status === 'ANULADA') throw new BadRequestException('No se puede modificar una compra anulada');
    this.compraRepo.merge(c, dto);
    return this.compraRepo.save(c);
  }

  /** Anulación lógica — no borra la fila, solo cambia status a ANULADA.
   *  También anula la CxP asociada para que no quede saldo pendiente fantasma. */
  async anular(id: number): Promise<FacturaCompra> {
    return this.dataSource.transaction(async (manager) => {
      const c = await manager.findOne(FacturaCompra, { where: { id } });
      if (!c) throw new NotFoundException(`Compra con ID ${id} no encontrada`);
      if (c.status === 'ANULADA') throw new ConflictException('La compra ya está anulada');
      c.status = 'ANULADA';
      await manager.save(c);

      // Anular CxP ligada si existe y aún está pendiente
      const cxp = await manager.findOne(CuentaPagar, {
        where: { compra_id: id, status: 'PENDIENTE' },
      });
      if (cxp) {
        cxp.status = 'ANULADO';
        await manager.save(cxp);

        // Revertir saldo_actual del proveedor solo cuando había una CxP PENDIENTE.
        // Si ya estaba pagada, el saldo fue reducido por el pago y no se toca aquí.
        await manager.query(
          `UPDATE proveedores SET saldo_actual = saldo_actual - $1 WHERE id = $2`,
          [Number(c.total_neto), c.proveedor_id],
        );
      }

      return c;
    });
  }

  async findDetalles(id: number): Promise<FacturaCompraDetalle[]> {
    await this.findOne(id);
    return this.detalleRepo.find({ where: { compra_id: id } });
  }
}
