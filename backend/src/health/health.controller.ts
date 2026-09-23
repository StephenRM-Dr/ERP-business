import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /** Pong simple — mide latencia de red sin tocar la DB */
  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'Ping simple (sin DB)' })
  ping() {
    return { status: 'pong', timestamp: new Date().toISOString() };
  }

  /** Ejecuta SELECT 1 contra Postgres y mide cuántos ms tarda */
  @Public()
  @Get('db')
  @ApiOperation({ summary: 'Ping a la base de datos (SELECT 1)' })
  async dbPing() {
    const start = performance.now();
    await this.dataSource.query('SELECT 1');
    const ms = Math.round((performance.now() - start) * 100) / 100;

    return {
      status: 'ok',
      db_response_ms: ms,
      timestamp: new Date().toISOString(),
    };
  }

  /** Query más pesada: cuenta registros en tablas clave para detectar cuellos de botella */
  @Public()
  @Get('db/detail')
  @ApiOperation({ summary: 'Diagnóstico detallado — latencia por tabla' })
  async dbDetail() {
    const tables = ['productos', 'stock', 'facturas', 'clientes', 'usuarios'];
    const results: Record<string, { count: number; ms: number }> = {};

    for (const table of tables) {
      const start = performance.now();
      const [{ count }] = await this.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM ${table}`,
      );
      const ms = Math.round((performance.now() - start) * 100) / 100;
      results[table] = { count, ms };
    }

    return {
      status: 'ok',
      tables: results,
      timestamp: new Date().toISOString(),
    };
  }
}
