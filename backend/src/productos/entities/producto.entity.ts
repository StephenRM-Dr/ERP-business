import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Moneda } from '../../monedas/entities/moneda.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { ProductoPrecio } from './producto-precio.entity';

@Entity('productos')
export class Producto {
  @ApiProperty({ description: 'ID único del producto' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'El código del producto', maxLength: 30 })
  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string;

  @ApiPropertyOptional({
    description: 'La referencia del producto',
    maxLength: 50,
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  referencia: string;

  @ApiProperty({ description: 'El nombre del producto', maxLength: 100 })
  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción detallada del producto' })
  @Column({ type: 'text', nullable: true })
  descripcion_detallada: string;

  @ApiProperty({ description: 'El ID de la categoría del producto' })
  @Column({ type: 'int' })
  categoria_id: number;

  @ManyToOne(() => Categoria)
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria;

  @ApiPropertyOptional({
    description: 'La unidad de medida del producto',
    default: 'UNIDAD',
    maxLength: 20,
  })
  @Column({ type: 'varchar', length: 20, default: 'UNIDAD', nullable: true })
  unidad_medida: string;

  @ApiPropertyOptional({ description: 'La marca del producto', maxLength: 50 })
  @Column({ type: 'varchar', length: 50, nullable: true })
  marca: string;

  @ApiProperty({ description: 'El ID de la moneda base del producto' })
  @Column({ type: 'int' })
  moneda_base_id: number;

  @ManyToOne(() => Moneda)
  @JoinColumn({ name: 'moneda_base_id' })
  moneda_base: Moneda;

  @ApiPropertyOptional({
    description: 'El precio de costo del producto',
    default: 0,
  })
  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  precio_costo: number;

  @ApiPropertyOptional({
    description: 'El precio de venta del producto',
    default: 0,
  })
  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  precio_venta: number;

  @ApiPropertyOptional({
    description:
      'El ID de la moneda en la que está expresado el precio de venta',
  })
  @Column({ type: 'int', nullable: true })
  moneda_venta_id: number;

  @ManyToOne(() => Moneda, { nullable: true })
  @JoinColumn({ name: 'moneda_venta_id' })
  moneda_venta: Moneda;

  @ApiPropertyOptional({
    description: 'El porcentaje de impuesto del producto',
    default: 0,
  })
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  impuesto_porcentaje: number;

  @ApiPropertyOptional({
    description: 'Indica si maneja lotes',
    default: false,
  })
  @Column({ type: 'boolean', default: false })
  maneja_lotes: boolean;

  @ApiPropertyOptional({
    description: 'Indica si maneja seriales',
    default: false,
  })
  @Column({ type: 'boolean', default: false })
  maneja_seriales: boolean;

  @ApiPropertyOptional({
    description: 'Indica si el producto está activo',
    default: true,
  })
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ApiPropertyOptional({ description: 'Fecha de creación' })
  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @ApiPropertyOptional({ description: 'El ID del departamento del producto' })
  @Column({ type: 'int', nullable: true })
  departamento_id: number;

  @ApiPropertyOptional({
    description: 'El modelo del producto',
    maxLength: 100,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  modelo: string;

  @ApiPropertyOptional({
    description: 'El peso en kg del producto',
    default: 0,
  })
  @Column({ type: 'numeric', precision: 10, scale: 3, default: 0 })
  peso_kg: number;

  @ApiPropertyOptional({
    description: 'La capacidad de contenido del producto',
    default: 1,
  })
  @Column({ type: 'numeric', precision: 18, scale: 4, default: 1 })
  capacidad_contenido: number;

  @ApiPropertyOptional({
    description: 'Indica si permite decimales',
    default: false,
  })
  @Column({ type: 'boolean', default: false })
  permite_decimales: boolean;

  @ApiPropertyOptional({
    description: 'Indica si está sujeto a comisión fija',
    default: false,
  })
  @Column({ type: 'boolean', default: false })
  sujeto_comision_fija: boolean;

  @ApiPropertyOptional({ description: 'Monto de comisión', default: 0 })
  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  monto_comision: number;

  @ApiPropertyOptional({
    description: 'Fecha de la última modificación del producto',
  })
  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;

  @ApiPropertyOptional({
    description: 'ID del usuario que hizo la última modificación',
  })
  @Column({ type: 'int', nullable: true })
  actualizado_por: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'actualizado_por' })
  actualizado_por_usuario: Usuario;

  @OneToMany(() => ProductoPrecio, (pp) => pp.producto)
  precios: ProductoPrecio[];
}
