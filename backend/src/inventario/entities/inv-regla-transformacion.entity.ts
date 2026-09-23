import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Producto } from '../../productos/entities/producto.entity';

export type TipoTransformacion =
  | 'POR_METRO'
  | 'ROLLO_A_METROS'
  | 'TAZAS'
  | 'HOJILLA_COMBO'
  | 'SPLIT_FIJO';

export interface SplitItem {
  producto_id: number;
  cantidad: number;
}

/**
 * Regla que define cómo se transforma un producto al ser procesado.
 *
 * Tipos disponibles:
 * - POR_METRO:      el material entra por metros; "partirlo" significa
 *                  dividir a la mitad e ingresar dos ítems más pequeños.
 * - ROLLO_A_METROS: 1 rollo = factor metros (ej. 50 m).
 * - TAZAS:          1 caja = factor unidades (18 o 36).
 * - HOJILLA_COMBO:  cada `factor` unidades forman 1 combo.
 * - SPLIT_FIJO:     produce los ítems exactos definidos en split_items
 *                  (ej. PAH 1.52m → 1 de 1.00m + 1 de 0.50m).
 */
@Entity('inv_reglas_transformacion')
export class InvReglaTransformacion {
  @ApiProperty({ description: 'ID único de la regla' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Producto al que aplica la regla' })
  @Column({ type: 'integer' })
  producto_id: number;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @ApiProperty({
    description: 'Tipo de transformación',
    enum: ['POR_METRO', 'ROLLO_A_METROS', 'TAZAS', 'HOJILLA_COMBO', 'SPLIT_FIJO'],
  })
  @Column({ type: 'varchar', length: 30 })
  tipo_transformacion: TipoTransformacion;

  @ApiProperty({
    description:
      'Factor numérico: metros/rollo, unidades/caja, unidades/combo. Ignorado en SPLIT_FIJO.',
    default: 1,
  })
  @Column({ type: 'numeric', precision: 10, scale: 4, default: 1 })
  factor: number;

  @ApiPropertyOptional({
    description:
      'Sólo SPLIT_FIJO: lista de ítems que produce la transformación. ' +
      'Ejemplo PAH: [{"producto_id":101,"cantidad":1},{"producto_id":102,"cantidad":1}]',
  })
  @Column({ type: 'jsonb', nullable: true })
  split_items: SplitItem[] | null;

  @ApiProperty({ description: 'Si la regla está activa', default: true })
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;
}
