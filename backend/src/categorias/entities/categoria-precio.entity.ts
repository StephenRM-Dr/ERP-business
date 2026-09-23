import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Categoria } from './categoria.entity';
import { NivelPrecio } from '../../niveles-precio/entities/nivel-precio.entity';

@Entity('categoria_precios')
export class CategoriaPrecio {
  @ApiProperty({ description: 'ID de la categoría' })
  @PrimaryColumn({ type: 'integer' })
  categoria_id: number;

  @ApiProperty({ description: 'ID del nivel de precio' })
  @PrimaryColumn({ type: 'integer' })
  nivel_precio_id: number;

  @ApiProperty({ description: 'Porcentaje de utilidad', default: 0 })
  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 })
  porcentaje_utilidad: number;

  @ApiProperty({ description: 'Porcentaje de descuento', default: 0 })
  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 })
  porcentaje_descuento: number;

  @ManyToOne(() => Categoria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria;

  @ManyToOne(() => NivelPrecio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nivel_precio_id' })
  nivelPrecio: NivelPrecio;
}
