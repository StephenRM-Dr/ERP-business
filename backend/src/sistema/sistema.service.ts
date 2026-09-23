import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RestablecerSistemaDto } from './dto/restablecer-sistema.dto';

@Injectable()
export class SistemaService {
  private readonly logger = new Logger(SistemaService.name);

  constructor(private readonly dataSource: DataSource) {}

  async restablecerSistema(dto: RestablecerSistemaDto, usuarioRol?: string): Promise<{ success: boolean; mensaje: string; registrosLimpiados: number }> {
    if (dto.confirmacion?.trim().toUpperCase() !== 'RESTABLECER') {
      throw new BadRequestException('Debe escribir exactamente "RESTABLECER" para confirmar la operación.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.warn(`Iniciando restablecimiento de sistema [Modo: ${dto.tipo}]...`);

      // Obtener todas las tablas existentes en la base de datos
      const tablasExistentesResult = await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `);
      const existingTables = new Set<string>(tablasExistentesResult.map((r: any) => String(r.table_name).toLowerCase()));

      // ─── 1. TABLAS OPERACIONALES Y STOCK (Siempre se limpian en ambos modos) ────────────
      const tablasOperacionales = [
        'recibo_cobro_detalles',
        'recibos_cobro',
        'cuentas_cobrar',
        'factura_venta_detalles',
        'facturas_ventas',
        'devolucion_venta_detalles',
        'devoluciones_ventas',
        'inventario_movimiento_detalles',
        'inventario_movimientos',
        'inv_transformaciones',
        'pago_proveedor_detalles',
        'pagos_proveedores',
        'cuentas_pagar',
        'factura_compra_detalles',
        'facturas_compras',
        'documentos_preliminares',
        'inventario_stock',
      ];

      const opTablesPresent = tablasOperacionales.filter((t) => existingTables.has(t.toLowerCase()));
      if (opTablesPresent.length > 0) {
        const tableListSql = opTablesPresent.map((t) => `"${t}"`).join(', ');
        await queryRunner.query(`TRUNCATE TABLE ${tableListSql} RESTART IDENTITY CASCADE;`);
      }

      // ─── 2. REINICIAR CORRELATIVOS DE DOCUMENTOS A 0 ─────────────────────────
      if (existingTables.has('tipos_documentos')) {
        try {
          await queryRunner.query(`
            UPDATE "tipos_documentos" 
            SET "correlativo_actual" = 0, "actualizado_en" = NOW();
          `);
        } catch (err) {
          this.logger.warn('No se pudo reiniciar tipos_documentos:', err);
        }
      }

      // ─── 3. SI ES MODO FÁBRICA TOTAL: LIMPIAR MAESTROS (Conservando Admin y Config Base) ──
      if (dto.tipo === 'FABRICA') {
        const tablasMaestros = [
          'seriales',
          'lotes',
          'producto_costos',
          'producto_precios',
          'productos',
          'categoria_precios',
          'categorias',
          'clientes',
          'proveedores',
          'vendedores',
          'cuentas_bancarias',
          'bancos',
        ];

        const maestroTablesPresent = tablasMaestros.filter((t) => existingTables.has(t.toLowerCase()));
        if (maestroTablesPresent.length > 0) {
          const maestroListSql = maestroTablesPresent.map((t) => `"${t}"`).join(', ');
          await queryRunner.query(`TRUNCATE TABLE ${maestroListSql} RESTART IDENTITY CASCADE;`);
        }

        // Borrar usuarios que no sean administradores (conservar ID 1 o ADMIN)
        if (existingTables.has('usuarios')) {
          try {
            await queryRunner.query(`
              DELETE FROM "usuarios" WHERE "rol_id" != 1 AND LOWER("email") NOT LIKE '%admin%' AND LOWER("username") != 'admin';
            `);
          } catch (err) {
            this.logger.warn('No se pudieron filtrar usuarios no administradores:', err);
          }
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Restablecimiento de sistema [Modo: ${dto.tipo}] completado exitosamente.`);

      return {
        success: true,
        mensaje: dto.tipo === 'FABRICA'
          ? 'Sistema restablecido a valores de fábrica exitosamente. Todas las tablas operativas y maestros han sido limpiados.'
          : 'Sistema restablecido exitosamente. Se han vaciado todas las ventas, cobros, inventario y cuentas por cobrar, y los correlativos fueron reiniciados a 0.',
        registrosLimpiados: opTablesPresent.length,
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error al restablecer sistema:', error);
      throw new BadRequestException(`Fallo al restablecer sistema: ${error?.message || error}`);
    } finally {
      await queryRunner.release();
    }
  }
}
