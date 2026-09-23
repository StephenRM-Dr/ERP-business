import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { Almacen } from '../../almacenes/entities/almacen.entity';

export type EstadoTransformacion = 'CONFIRMADA' | 'ANULADA';

export interface ItemTransformacionDetalle {
  producto_id: number;
  codigo?: string;
  descripcion?: string;
  cantidad: number;
  costo_unitario?: number;
  peso_kg?: number;
  unidad_medida?: string;
  deposito_id?: number;
}

export type ItemResultado = ItemTransformacionDetalle;

/**
 * Registro auditable de cada transformación ejecutada.
 * Puede registrar una regla directa o un proceso completo de doble módulo:
 * Materiales a consumir (Descargo) y Productos terminados (Cargo).
 */
@Entity('inv_transformaciones')
export class InvTransformacion {
  @ApiProperty({ description: 'ID único de la transformación' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Número de documento (ej. TRF-00000001)' })
  @Column({ type: 'varchar', length: 30, unique: true })
  numero_documento: string;

  @ApiPropertyOptional({ description: 'Correlativo del documento de descargo generado (código D)' })
  @Column({ type: 'varchar', length: 30, nullable: true })
  descargo_documento: string | null;

  @ApiPropertyOptional({ description: 'Correlativo del documento de cargo generado (código C)' })
  @Column({ type: 'varchar', length: 30, nullable: true })
  cargo_documento: string | null;

  @ApiProperty({ description: 'Sucursal donde se realizó' })
  @Column({ type: 'integer' })
  sucursal_id: number;

  @ManyToOne(() => Sucursal)
  @JoinColumn({ name: 'sucursal_id' })
  sucursal: Sucursal;

  @ApiProperty({ description: 'Usuario que ejecutó la transformación' })
  @Column({ type: 'integer' })
  usuario_id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ApiPropertyOptional({ description: 'Depósito/almacén origen (materiales consumidos)' })
  @Column({ type: 'integer', nullable: true })
  deposito_origen_id: number | null;

  @ManyToOne(() => Almacen)
  @JoinColumn({ name: 'deposito_origen_id' })
  deposito_origen: Almacen;

  @ApiPropertyOptional({ description: 'Depósito/almacén destino (productos terminados)' })
  @Column({ type: 'integer', nullable: true })
  deposito_destino_id: number | null;

  @ManyToOne(() => Almacen)
  @JoinColumn({ name: 'deposito_destino_id' })
  deposito_destino: Almacen;

  @ApiPropertyOptional({ description: 'ID del movimiento de descargo generado' })
  @Column({ type: 'integer', nullable: true })
  movimiento_descargo_id: number | null;

  @ApiPropertyOptional({ description: 'ID del movimiento de cargo generado' })
  @Column({ type: 'integer', nullable: true })
  movimiento_cargo_id: number | null;

  @ApiPropertyOptional({ description: 'Materiales consumidos (Módulo 1)' })
  @Column({ type: 'jsonb', default: [] })
  items_consumidos: ItemTransformacionDetalle[];

  @ApiProperty({ description: 'Productos terminados / generados (Módulo 2)' })
  @Column({ type: 'jsonb', default: [] })
  items_resultado: ItemTransformacionDetalle[];

  @ApiPropertyOptional({ description: 'Costo total de materiales consumidos' })
  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  costo_total_consumido: number;

  @ApiPropertyOptional({ description: 'Costo total de productos generados' })
  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  costo_total_generado: number;

  @ApiPropertyOptional({ description: 'Peso total en kg de materiales consumidos' })
  @Column({ type: 'numeric', precision: 18, scale: 3, default: 0 })
  peso_total_consumido_kg: number;

  @ApiPropertyOptional({ description: 'Peso total en kg de productos generados' })
  @Column({ type: 'numeric', precision: 18, scale: 3, default: 0 })
  peso_total_generado_kg: number;

  // Campos retrocompatibles con transformaciones simples
  @ApiPropertyOptional({ description: 'Producto origen en transformaciones unitarias' })
  @Column({ type: 'integer', nullable: true })
  producto_origen_id: number | null;

  @ManyToOne(() => Producto, { nullable: true })
  @JoinColumn({ name: 'producto_origen_id' })
  producto_origen: Producto | null;

  @ApiPropertyOptional({ description: 'Cantidad consumida en transformaciones unitarias' })
  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  cantidad_origen: number | null;

  @ApiPropertyOptional({ description: 'Depósito en transformaciones unitarias' })
  @Column({ type: 'integer', nullable: true })
  deposito_id: number | null;

  @ManyToOne(() => Almacen, { nullable: true })
  @JoinColumn({ name: 'deposito_id' })
  deposito: Almacen | null;

  @ApiProperty({
    description: 'Estado de la transformación',
    enum: ['CONFIRMADA', 'ANULADA'],
    default: 'CONFIRMADA',
  })
  @Column({ type: 'varchar', length: 20, default: 'CONFIRMADA' })
  estado: EstadoTransformacion;

  @ApiPropertyOptional({ description: 'Observación u nota libre' })
  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @ApiProperty({ description: 'Fecha de ejecución' })
  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;
}
