import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './entities/producto.entity';
import { ProductoCosto } from './entities/producto-costo.entity';
import { ProductoPrecio } from './entities/producto-precio.entity';
import { CreateProductoCostoDto } from './dto/create-producto-costo.dto';
import { CreateProductoPrecioDto } from './dto/create-producto-precio.dto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(ProductoCosto)
    private readonly productoCostoRepository: Repository<ProductoCosto>,
    @InjectRepository(ProductoPrecio)
    private readonly productoPrecioRepository: Repository<ProductoPrecio>,
  ) {}

  private async save(producto: Producto): Promise<Producto> {
    try {
      return await this.productoRepository.save(producto);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          `Ya existe un producto con el código ${producto.codigo}`,
        );
      }
      throw error;
    }
  }

  async create(
    createProductoDto: CreateProductoDto,
    userId: number,
  ): Promise<Producto> {
    const producto = this.productoRepository.create({
      ...createProductoDto,
      actualizado_por: userId,
    });
    return await this.save(producto);
  }

  async findAll(take?: number, skip = 0): Promise<Producto[]> {
    // `precios` is a one-to-many relation (~17 rows per product). Loading it
    // via TypeORM's `relations` option JOINs it in, which multiplies the
    // result set (1385 products -> 23545 rows) and makes entity hydration
    // very slow (~8s). Instead, fetch products (with only its to-one
    // relations, which don't fan out) and the price rows in two separate
    // queries, then attach them in memory — same data, no row explosion.
    const options: any = {
      order: { id: 'ASC' },
      relations: {
        categoria: true,
        moneda_base: true,
        actualizado_por_usuario: true,
      },
    };
    if (take !== undefined && take !== null) {
      options.take = take;
      options.skip = skip;
    }
    const productos = await this.productoRepository.find(options);
    if (productos.length === 0) {
      return productos;
    }

    const precios = await this.productoPrecioRepository.find({
      where: { producto_id: In(productos.map((p) => p.id)) },
    });
    const preciosByProductoId = new Map<number, ProductoPrecio[]>();
    for (const precio of precios) {
      const list = preciosByProductoId.get(precio.producto_id) ?? [];
      list.push(precio);
      preciosByProductoId.set(precio.producto_id, list);
    }
    for (const producto of productos) {
      producto.precios = preciosByProductoId.get(producto.id) ?? [];
    }

    return productos;
  }

  async findOne(codigo: string): Promise<Producto> {
    const producto = await this.productoRepository.findOne({
      where: { codigo },
      relations: {
        categoria: true,
        moneda_base: true,
        actualizado_por_usuario: true,
      },
    });
    if (!producto) {
      throw new NotFoundException(
        `Producto con código ${codigo} no encontrado`,
      );
    }
    return producto;
  }

  /**
   * Igual que findOne pero sin las relaciones de display (categoria,
   * moneda_base, actualizado_por_usuario). Para los métodos internos de
   * abajo que solo necesitan el id del producto antes de un merge()/save()
   * o de resolver una fila hija — pedir esos tres joins en cada write es
   * trabajo que nadie lee.
   */
  private async findEntity(codigo: string): Promise<Producto> {
    const producto = await this.productoRepository.findOne({ where: { codigo } });
    if (!producto) {
      throw new NotFoundException(
        `Producto con código ${codigo} no encontrado`,
      );
    }
    return producto;
  }

  async update(
    codigo: string,
    updateProductoDto: UpdateProductoDto,
    userId: number,
  ): Promise<Producto> {
    const producto = await this.findEntity(codigo);
    this.productoRepository.merge(producto, updateProductoDto, {
      actualizado_por: userId,
    });
    return await this.save(producto);
  }

  async remove(codigo: string): Promise<void> {
    const producto = await this.findEntity(codigo);
    await this.productoRepository.remove(producto);
  }

  // --- Costos ---
  async getCostos(codigo: string): Promise<ProductoCosto[]> {
    const producto = await this.findEntity(codigo);
    return await this.productoCostoRepository.find({
      where: { producto_id: producto.id },
      order: { fecha_vigencia: 'DESC' },
      relations: { moneda: true },
    });
  }

  async addCosto(codigo: string, dto: CreateProductoCostoDto): Promise<ProductoCosto> {
    const producto = await this.findEntity(codigo);
    // Insert new costo. The DB trigger will deactivate previous ones.
    const nuevoCosto = this.productoCostoRepository.create({
      ...dto,
      producto_id: producto.id,
      activo: true,
    });
    return await this.productoCostoRepository.save(nuevoCosto);
  }

  async updateCosto(codigo: string, costoId: number, dto: Partial<CreateProductoCostoDto>): Promise<ProductoCosto> {
    const producto = await this.findEntity(codigo);
    const costo = await this.productoCostoRepository.findOne({ where: { id: costoId, producto_id: producto.id } });
    if (!costo) throw new NotFoundException(`Costo con ID ${costoId} no encontrado para el producto ${codigo}`);
    this.productoCostoRepository.merge(costo, dto);
    return this.productoCostoRepository.save(costo);
  }

  async removeCosto(codigo: string, costoId: number): Promise<void> {
    const producto = await this.findEntity(codigo);
    const costo = await this.productoCostoRepository.findOne({ where: { id: costoId, producto_id: producto.id } });
    if (!costo) throw new NotFoundException(`Costo con ID ${costoId} no encontrado para el producto ${codigo}`);
    await this.productoCostoRepository.remove(costo);
  }

  // --- Precios ---
  async getPrecios(codigo: string): Promise<ProductoPrecio[]> {
    const producto = await this.findEntity(codigo);
    return await this.productoPrecioRepository.find({
      where: { producto_id: producto.id },
      order: { nivel_precio_id: 'ASC', fecha_vigencia: 'DESC' },
      relations: { moneda: true },
    });
  }

  async addPrecio(codigo: string, dto: CreateProductoPrecioDto): Promise<ProductoPrecio> {
    const producto = await this.findEntity(codigo);
    // Insert new precio. The DB trigger will deactivate previous ones for the same level.
    const nuevoPrecio = this.productoPrecioRepository.create({
      ...dto,
      producto_id: producto.id,
      activo: true,
    });
    return await this.productoPrecioRepository.save(nuevoPrecio);
  }

  async updatePrecio(codigo: string, precioId: number, dto: Partial<CreateProductoPrecioDto>): Promise<ProductoPrecio> {
    const producto = await this.findEntity(codigo);
    const precio = await this.productoPrecioRepository.findOne({ where: { id: precioId, producto_id: producto.id } });
    if (!precio) throw new NotFoundException(`Precio con ID ${precioId} no encontrado para el producto ${codigo}`);
    this.productoPrecioRepository.merge(precio, dto);
    return this.productoPrecioRepository.save(precio);
  }

  async removePrecio(codigo: string, precioId: number): Promise<void> {
    const producto = await this.findEntity(codigo);
    const precio = await this.productoPrecioRepository.findOne({ where: { id: precioId, producto_id: producto.id } });
    if (!precio) throw new NotFoundException(`Precio con ID ${precioId} no encontrado para el producto ${codigo}`);
    await this.productoPrecioRepository.remove(precio);
  }

  // --- Excel Import / Export / Batch ---
  async updatePreciosBatch(items: Array<{ codigo: string; nivel_precio_id: number; moneda_id: number; precio: number }>): Promise<{ updated: number; message: string }> {
    if (!items || items.length === 0) {
      return { updated: 0, message: 'No items provided' };
    }

    // 1. Deduplicate by composite key (codigo + nivel_precio_id) so a single SQL INSERT never contains duplicate conflict targets
    const uniqueMap = new Map<string, { codigo: string; nivel_precio_id: number; moneda_id: number; precio: number }>();
    for (const item of items) {
      if (item && item.codigo) {
        const key = `${item.codigo.trim()}_${item.nivel_precio_id}`;
        uniqueMap.set(key, item);
      }
    }
    const deduplicatedItems = Array.from(uniqueMap.values());

    const codigos = [...new Set(deduplicatedItems.map((i) => i.codigo.trim()))];
    const productos = await this.productoRepository
      .createQueryBuilder('p')
      .select(['p.id', 'p.codigo'])
      .where('p.codigo IN (:...codigos)', { codigos })
      .getMany();

    const productMap = new Map<string, number>();
    productos.forEach((p) => productMap.set(p.codigo, p.id));

    const valuesToInsert: Array<{ producto_id: number; nivel_precio_id: number; moneda_id: number; precio: number; activo: boolean }> = [];
    for (const item of deduplicatedItems) {
      const prodId = productMap.get(item.codigo.trim());
      if (prodId) {
        valuesToInsert.push({
          producto_id: prodId,
          nivel_precio_id: item.nivel_precio_id,
          moneda_id: item.moneda_id,
          precio: Number(item.precio) || 0,
          activo: true,
        });
      }
    }

    let updatedCount = 0;
    const CHUNK_SIZE = 500;
    for (let i = 0; i < valuesToInsert.length; i += CHUNK_SIZE) {
      const chunk = valuesToInsert.slice(i, i + CHUNK_SIZE);
      await this.productoPrecioRepository
        .createQueryBuilder()
        .insert()
        .into(ProductoPrecio)
        .values(chunk)
        .orUpdate(['precio', 'moneda_id', 'activo'], ['producto_id', 'nivel_precio_id'])
        .execute();
      updatedCount += chunk.length;
    }

    return { updated: updatedCount, message: `Se actualizaron ${updatedCount} precios exitosamente.` };
  }

  private getScriptPath(): string {
    const candidates = [
      path.resolve(process.cwd(), 'scripts/procesar_excel_precios.py'),
      path.resolve(__dirname, '../../../scripts/procesar_excel_precios.py'),
      path.resolve(__dirname, '../../scripts/procesar_excel_precios.py'),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) return cand;
    }
    return candidates[0];
  }

  private getTempDir(): string {
    const tempDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
  }

  async previewPreciosFromExcel(buffer: Buffer, tipo: 'BS' | 'DIVISA'): Promise<{
    totalProducts: number;
    totalPriceEntries: number;
    sampleItems: Array<{
      codigo: string;
      nombre: string;
      precios: Record<number, number>;
    }>;
    rawItems: Array<{ codigo: string; nivel_precio_id: number; moneda_id: number; precio: number }>;
  }> {
    const tempDir = this.getTempDir();
    const tempFilePath = path.join(tempDir, `preview_${tipo}_${Date.now()}.xlsx`);
    fs.writeFileSync(tempFilePath, buffer);

    const scriptPath = this.getScriptPath();
    const cmd = tipo === 'BS' ? 'parse-bs' : 'parse-divisas';

    try {
      const { stdout } = await execFileAsync('python', [scriptPath, cmd, tempFilePath], {
        maxBuffer: 50 * 1024 * 1024,
      });

      const parsedItems: Array<{ codigo: string; nivel_precio_id: number; moneda_id: number; precio: number }> = JSON.parse(stdout);
      
      const naturalSort = (a: string, b: string) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

      const uniqueCodigos = [...new Set(parsedItems.map((i) => i.codigo))].sort(naturalSort);
      const sampleCodigos = uniqueCodigos.slice(0, 30);
      let prodMap = new Map<string, string>();
      
      if (sampleCodigos.length > 0) {
        const productos = await this.productoRepository
          .createQueryBuilder('p')
          .select(['p.id', 'p.codigo', 'p.nombre'])
          .where('p.codigo IN (:...codigos)', { codigos: sampleCodigos })
          .getMany();
        prodMap = new Map(productos.map((p) => [p.codigo, p.nombre]));
      }

      const sampleMap = new Map<string, { codigo: string; nombre: string; precios: Record<number, number> }>();
      for (const item of parsedItems) {
        if (!sampleMap.has(item.codigo) && sampleMap.size < 15) {
          sampleMap.set(item.codigo, {
            codigo: item.codigo,
            nombre: prodMap.get(item.codigo) || item.codigo,
            precios: {},
          });
        }
        if (sampleMap.has(item.codigo)) {
          sampleMap.get(item.codigo)!.precios[item.nivel_precio_id] = item.precio;
        }
      }

      return {
        totalProducts: uniqueCodigos.length,
        totalPriceEntries: parsedItems.length,
        sampleItems: Array.from(sampleMap.values()),
        rawItems: parsedItems,
      };
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  async importPreciosFromExcel(buffer: Buffer, tipo: 'BS' | 'DIVISA'): Promise<{ updated: number; message: string }> {
    const tempDir = this.getTempDir();
    const tempFilePath = path.join(tempDir, `import_${tipo}_${Date.now()}.xlsx`);
    fs.writeFileSync(tempFilePath, buffer);

    const scriptPath = this.getScriptPath();
    const cmd = tipo === 'BS' ? 'parse-bs' : 'parse-divisas';

    try {
      const { stdout } = await execFileAsync('python', [scriptPath, cmd, tempFilePath], {
        maxBuffer: 50 * 1024 * 1024,
      });

      const parsedItems = JSON.parse(stdout);
      const result = await this.updatePreciosBatch(parsedItems);
      return result;
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  async exportPreciosToExcel(tipo: 'BS' | 'DIVISA'): Promise<string> {
    const tempDir = this.getTempDir();
    const outputFilePath = path.join(tempDir, `PRECIOS_${tipo}_${Date.now()}.xlsx`);
    const tempJsonPath = path.join(tempDir, `export_data_${Date.now()}.json`);

    const productos = await this.productoRepository.find({
      relations: { precios: true },
    });

    productos.sort((a, b) =>
      a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' })
    );

    const exportData = productos.map((p) => {
      const pMap: Record<number, number> = {};
      (p.precios || []).forEach((pr) => {
        pMap[pr.nivel_precio_id] = Number(pr.precio);
      });

      if (tipo === 'BS') {
        return {
          codigo: p.codigo,
          nombre: p.nombre,
          categoria_id: p.categoria_id,
          sc: pMap[2] ?? p.precio_venta ?? 0,
          concordia: pMap[4] ?? p.precio_venta ?? 0,
          caracas: pMap[5] ?? p.precio_venta ?? 0,
          valencia: pMap[6] ?? p.precio_venta ?? 0,
          barinas: pMap[7] ?? p.precio_venta ?? 0,
          maracaibo: pMap[8] ?? p.precio_venta ?? 0,
          nacional: pMap[10] ?? p.precio_venta ?? 0,
          merida: pMap[9] ?? p.precio_venta ?? 0,
          guayana: pMap[3] ?? p.precio_venta ?? 0,
        };
      } else {
        return {
          codigo: p.codigo,
          nombre: p.nombre,
          categoria_id: p.categoria_id,
          sc: pMap[11] ?? p.precio_costo ?? 0,
          concordia: pMap[11] ?? p.precio_costo ?? 0,
          caracas: pMap[13] ?? p.precio_costo ?? 0,
          valencia: pMap[14] ?? p.precio_costo ?? 0,
          barinas: pMap[15] ?? p.precio_costo ?? 0,
          maracaibo: pMap[16] ?? p.precio_costo ?? 0,
          nacional: pMap[12] ?? p.precio_costo ?? 0,
          merida: pMap[17] ?? p.precio_costo ?? 0,
        };
      }
    });

    fs.writeFileSync(tempJsonPath, JSON.stringify(exportData), 'utf-8');

    const scriptPath = this.getScriptPath();
    const cmd = tipo === 'BS' ? 'write-bs' : 'write-divisas';

    try {
      await execFileAsync('python', [scriptPath, cmd, outputFilePath, tempJsonPath]);
      return outputFilePath;
    } finally {
      if (fs.existsSync(tempJsonPath)) {
        fs.unlinkSync(tempJsonPath);
      }
    }
  }
}

