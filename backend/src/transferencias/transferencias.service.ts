import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { RecibirTransferenciaDto } from './dto/recibir-transferencia.dto';
import { Transferencia } from './entities/transferencia.entity';
import { TransferenciaItem } from './entities/transferencia-item.entity';
import { StockService } from '../stock/stock.service';
import { Stock } from '../stock/entities/stock.entity';

@Injectable()
export class TransferenciasService {
  constructor(
    @InjectRepository(Transferencia)
    private readonly transferenciasRepository: Repository<Transferencia>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createTransferenciaDto: CreateTransferenciaDto,
    userId: number = 1,
    sucursalId: number = 1,
  ) {
    let tipoMovimiento = 'DESCARGO';
    let codigoDoc = 'D';
    if (createTransferenciaDto.categoria === 'NEW_MERCHANDISE') {
      tipoMovimiento = 'CARGO';
      codigoDoc = 'C';
    } else if (createTransferenciaDto.categoria === 'BRANCH_TRANSFER') {
      tipoMovimiento = 'TRANSFERENCIA';
      codigoDoc = 'TR';
    }

    let numeroDoc = codigoDoc + '-' + Date.now(); // Fallback
    const result = await this.dataSource.query(
      `UPDATE tipos_documentos SET correlativo_actual = correlativo_actual + 1, actualizado_en = NOW() WHERE sucursal_id = $1 AND codigo = $2 RETURNING correlativo_actual, longitud_formato, prefijo`,
      [sucursalId, codigoDoc]
    );
    
    if (result && result[0] && result[0].length > 0) {
      const conf = result[0][0];
      const correlativoStr = String(conf.correlativo_actual).padStart(conf.longitud_formato, '0');
      const prefijo = conf.prefijo ? conf.prefijo : (codigoDoc + '-');
      numeroDoc = prefijo + correlativoStr;
    }

    const transferencia = this.transferenciasRepository.create({
      numero_documento: numeroDoc,
      tipo_movimiento: tipoMovimiento,
      categoria: createTransferenciaDto.categoria,
      deposito_origen_id: createTransferenciaDto.almacen_origen_id,
      deposito_destino_id: createTransferenciaDto.almacen_destino_id,
      estado: 'REQUESTED',
      motivo: createTransferenciaDto.motivo ?? createTransferenciaDto.categoria,
      usuario_id: userId,
      sucursal_id: sucursalId,
      items: createTransferenciaDto.items.map((item) => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad_solicitada,
        costo_unitario: 0,
      })),
    });

    const saved = await this.transferenciasRepository.save(transferencia);
    return this.mapToFrontendFormat(saved);
  }

  async findAll(take = 200, skip = 0) {
    // take/skip evita traer toda la tabla en cada apertura de pantalla.
    const transferencias = await this.transferenciasRepository.find({
      relations: { items: true },
      order: { id: 'DESC' },
      take,
      skip,
    });
    return transferencias.map((t) => this.mapToFrontendFormat(t));
  }

  async findOne(id: number) {
    const transferencia = await this.transferenciasRepository.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!transferencia)
      throw new NotFoundException(`Transferencia con ID ${id} no encontrada`);
    return this.mapToFrontendFormat(transferencia);
  }

  async despachar(id: number) {
    const transferencia = await this.transferenciasRepository.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!transferencia) throw new NotFoundException();

    transferencia.estado = 'IN_TRANSIT';
    await this.transferenciasRepository.save(transferencia);
    return this.findOne(id);
  }

  async recibir(id: number, dto?: RecibirTransferenciaDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transferencia = await queryRunner.manager.findOne(Transferencia, {
        where: { id },
        relations: { items: true },
      });
      if (!transferencia) throw new NotFoundException();

      let isPartial = false;

      for (const item of transferencia.items) {
        let cantidadRecibida = Number(item.cantidad);

        if (dto && dto.items) {
          const matchedItem = dto.items.find((i) => i.producto_id === item.producto_id);
          if (matchedItem && matchedItem.cantidad_recibida !== undefined) {
            cantidadRecibida = Number(matchedItem.cantidad_recibida);
          }
        }

        if (cantidadRecibida < Number(item.cantidad)) {
          isPartial = true;
        }

        item.cantidad_recibida = cantidadRecibida;
        await queryRunner.manager.save(item);

        // El stock se ajustó automáticamente mediante el Trigger de BD en la inserción
        // del movimiento. No descontamos de nuevo aquí para evitar doble resta.
      }

      transferencia.estado = isPartial ? 'RECEIVED_PARTIAL' : 'RECEIVED_CONFIRMED';
      await queryRunner.manager.save(transferencia);

      await queryRunner.commitTransaction();
      return this.mapToFrontendFormat(transferencia);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelar(id: number) {
    const transferencia = await this.transferenciasRepository.findOne({
      where: { id },
    });
    if (!transferencia) throw new NotFoundException();
    transferencia.estado = 'CANCELLED';
    await this.transferenciasRepository.save(transferencia);
    return this.findOne(id);
  }

  private mapToFrontendFormat(t: Transferencia) {
    return {
      id: t.id,
      numero_documento: t.numero_documento,
      tipo_movimiento: t.tipo_movimiento,
      // Rows created before the `categoria` column existed fall back to the
      // best guess derivable from tipo_movimiento (see the 2026-08-01
      // migration backfill for the same logic applied in SQL).
      categoria: t.categoria ?? (t.tipo_movimiento === 'CARGO' ? 'NEW_MERCHANDISE' : 'BRANCH_TRANSFER'),
      motivo: t.motivo,
      almacen_origen_id: t.deposito_origen_id,
      almacen_destino_id: t.deposito_destino_id,
      estado: t.estado || 'REQUESTED',
      creado_en: t.fecha_operacion,
      items: t.items?.map((item) => ({
        producto_id: item.producto_id,
        cantidad_solicitada: item.cantidad,
        cantidad_recibida: item.cantidad_recibida ?? item.cantidad,
      })),
    };
  }
}
