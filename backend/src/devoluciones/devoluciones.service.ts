import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateDevolucionDto } from './dto/create-devolucion.dto';
import { Devolucion } from './entities/devolucion.entity';
import { DevolucionItem } from './entities/devolucion-item.entity';
import { Factura } from '../facturas/entities/factura.entity';
import { CuentaCobrar } from '../facturas/entities/cuenta-cobrar.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { generarCorrelativoDocumento } from '../common/helpers/correlativo.helper';

@Injectable()
export class DevolucionesService {
  constructor(
    @InjectRepository(Devolucion)
    private readonly devolucionesRepository: Repository<Devolucion>,
    @InjectRepository(Factura)
    private readonly facturaRepository: Repository<Factura>,
    @InjectRepository(CuentaCobrar)
    private readonly cxcRepository: Repository<CuentaCobrar>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDevolucionDto: CreateDevolucionDto,
    currentUser: CurrentUserPayload,
    sucursalId: number = 1,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ── 1. VALIDAR: Solo administrador (rolId=1) puede crear sin clave admin ──
      const esAdmin = currentUser.rolId === 1;
      if (!esAdmin) {
        if (!createDevolucionDto.admin_password) {
          throw new UnauthorizedException(
            'Se requiere clave de administrador para registrar una devolución.',
          );
        }
        // Buscar el primer usuario activo con rol de administrador
        const adminUser = await queryRunner.manager.findOne(Usuario, {
          where: { rol_id: 1, activo: true },
          select: { id: true, clave_hash: true },
        });
        if (!adminUser) {
          throw new BadRequestException(
            'No existe un administrador activo en el sistema.',
          );
        }
        const claveValida = await bcrypt.compare(
          createDevolucionDto.admin_password,
          adminUser.clave_hash,
        );
        if (!claveValida) {
          throw new UnauthorizedException('Clave de administrador incorrecta.');
        }
      }

      // ── 2. VALIDAR: No debe existir devolución activa para esta factura ──
      const devolucionExistente = await queryRunner.manager.findOne(
        Devolucion,
        {
          where: [
            { factura_id: createDevolucionDto.factura_id, estado: 'PENDIENTE' },
            { factura_id: createDevolucionDto.factura_id, estado: 'PROCESADA' },
          ],
        },
      );
      if (devolucionExistente) {
        throw new BadRequestException(
          `Ya existe la devolución ${devolucionExistente.numero_devolucion} activa ` +
            `para esta factura. Debe anularla antes de crear una nueva.`,
        );
      }

      // ── 3. Buscar la factura original para obtener sus datos reales ──
      const factura = await queryRunner.manager.findOne(Factura, {
        where: { id: createDevolucionDto.factura_id },
        relations: { items: true },
      });
      if (!factura) {
        throw new NotFoundException(
          `Factura con ID ${createDevolucionDto.factura_id} no encontrada`,
        );
      }

      // ── 4. Obtener correlativo concatenado con sigla de sucursal ──
      const numeroDoc = await generarCorrelativoDocumento(queryRunner.manager, sucursalId, 'DEV', 'DEV-');

      // ── 5. Construir items con datos reales de la factura ──
      const devolucionItems: Array<{
        producto_id: number;
        deposito_id: number;
        cantidad: number;
        precio_unitario: number;
        es_exento: boolean;
        impuesto_porcentaje: number;
        monto_iva_linea: number;
        neto_linea: number;
      }> = [];

      let totalNeto = 0;
      let baseImponible = 0;
      let baseExenta = 0;
      let montoIva = 0;

      for (const itemDto of createDevolucionDto.items) {
        const facturaItem = factura.items.find(
          (fi) => fi.id === itemDto.factura_item_id,
        );
        if (!facturaItem) {
          throw new BadRequestException(
            `Factura item con ID ${itemDto.factura_item_id} no encontrado en la factura ${factura.id}`,
          );
        }

        const netoLinea =
          Number(itemDto.cantidad_devuelta) *
          Number(facturaItem.precio_unitario);
        const ivaLinea = facturaItem.es_exento
          ? 0
          : netoLinea * (Number(facturaItem.impuesto_porcentaje) / 100);

        devolucionItems.push({
          producto_id: itemDto.producto_id,
          deposito_id: facturaItem.deposito_id,
          cantidad: itemDto.cantidad_devuelta,
          precio_unitario: Number(facturaItem.precio_unitario),
          es_exento: facturaItem.es_exento,
          impuesto_porcentaje: Number(facturaItem.impuesto_porcentaje),
          monto_iva_linea: ivaLinea,
          neto_linea: netoLinea,
        });

        totalNeto += netoLinea;
        if (facturaItem.es_exento) {
          baseExenta += netoLinea;
        } else {
          baseImponible += netoLinea;
          montoIva += ivaLinea;
        }
      }

      // ── 6. Guardar la devolución y sus items en un solo round-trip ──
      const devolucion = queryRunner.manager.create(Devolucion, {
        sucursal_id: sucursalId,
        numero_devolucion: numeroDoc,
        factura_id: createDevolucionDto.factura_id,
        cliente_id: factura.cliente_id,
        moneda_id: factura.moneda_id,
        tasa_cambio: Number(factura.tasa_cambio),
        base_exenta: baseExenta,
        base_imponible: baseImponible,
        monto_iva: montoIva,
        total_neto: totalNeto,
        usuario_id: currentUser.id,
        motivo: createDevolucionDto.motivo,
        estado: 'PENDIENTE',
      });


      const savedDevolucion = await queryRunner.manager.save(devolucion);

      const itemsToSave = devolucionItems.map((itemData) =>
        queryRunner.manager.create(DevolucionItem, {
          devolucion_id: savedDevolucion.id,
          ...itemData,
        }),
      );
      await queryRunner.manager.save(itemsToSave);

      // ── 7. Cruzar automáticamente con la Cuenta por Cobrar (CxC) ──
      const facturaCxc = await queryRunner.manager.findOne(CuentaCobrar, {
        where: { factura_id: factura.id },
      });

      let saldoDescontado = 0;
      let saldoRestanteDevolucion = Number(totalNeto);

      if (facturaCxc && Number(facturaCxc.saldo_pendiente) > 0) {
        const saldoActual = Number(facturaCxc.saldo_pendiente);
        saldoDescontado = Math.min(saldoActual, saldoRestanteDevolucion);
        facturaCxc.saldo_pendiente = Math.max(0, saldoActual - saldoDescontado);
        if (facturaCxc.saldo_pendiente <= 0) {
          facturaCxc.status = 'PAGADO';
        }
        await queryRunner.manager.save(facturaCxc);
        saldoRestanteDevolucion -= saldoDescontado;
      }

      // Registrar la Nota de Crédito en Cuentas por Cobrar
      const cxcDevolucion = queryRunner.manager.create(CuentaCobrar, {
        cliente_id: factura.cliente_id,
        tipo_documento: 'NOTA_CREDITO',
        numero_documento: savedDevolucion.numero_devolucion,
        factura_id: factura.id,
        devolucion_id: savedDevolucion.id,
        fecha_vencimiento: new Date().toISOString().slice(0, 10),
        monto_original: totalNeto,
        saldo_pendiente: saldoRestanteDevolucion,
        moneda_id: factura.moneda_id,
        tasa_cambio: Number(factura.tasa_cambio) || 1,
        status: saldoRestanteDevolucion > 0 ? 'PENDIENTE' : 'PAGADO',
      });
      await queryRunner.manager.save(cxcDevolucion);

      await queryRunner.commitTransaction();
      return this.findOne(savedDevolucion.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(take = 200, skip = 0) {
    // take/skip evita traer toda la tabla en cada apertura de pantalla.
    const devoluciones = await this.devolucionesRepository.find({
      order: { id: 'DESC' },
      take,
      skip,
    });
    return devoluciones.map((d) => this.mapToFrontendFormat(d));
  }

  async findOne(id: number) {
    const devolucion = await this.devolucionesRepository.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!devolucion)
      throw new NotFoundException(`Devolución con ID ${id} no encontrada`);
    return this.mapToFrontendFormat(devolucion);
  }

  async procesar(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const devolucion = await queryRunner.manager.findOne(Devolucion, {
        where: { id },
        relations: { items: true },
      });
      if (!devolucion) throw new NotFoundException();

      // El stock ya se sumó automáticamente gracias al Trigger en la base de datos
      // ('trg_inv_devolucion_venta') que se disparó al insertar los detalles.
      // Ya no es necesario sumar manualmente a Stock aquí.

      devolucion.estado = 'PROCESADA';
      await queryRunner.manager.save(devolucion);

      await queryRunner.commitTransaction();
      return this.mapToFrontendFormat(devolucion);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async anular(id: number) {
    const devolucion = await this.devolucionesRepository.findOne({
      where: { id },
    });
    if (!devolucion) throw new NotFoundException();
    devolucion.estado = 'ANULADA';
    await this.devolucionesRepository.save(devolucion);
    return this.findOne(id);
  }

  private mapToFrontendFormat(d: Devolucion) {
    return {
      id: d.id,
      numero_devolucion: d.numero_devolucion,
      factura_id: d.factura_id,
      cliente_id: d.cliente_id,
      moneda_id: d.moneda_id,
      tasa_cambio: d.tasa_cambio,
      total_neto: d.total_neto,
      motivo: d.motivo,
      estado: d.estado,
      creado_en: d.fecha_devolucion,
      items: d.items?.map((item) => ({
        id: item.id,
        producto_id: item.producto_id,
        deposito_id: item.deposito_id,
        cantidad_devuelta: item.cantidad,
        precio_unitario: item.precio_unitario,
        neto_linea: item.neto_linea,
      })),
    };
  }
}
