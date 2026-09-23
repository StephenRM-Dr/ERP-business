import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('monedas')
export class Moneda {
  @ApiProperty({ description: 'ID único de la moneda' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'El código ISO de la moneda', maxLength: 10 })
  @Column({ type: 'varchar', length: 10, unique: true })
  codigo_iso: string;

  @ApiProperty({ description: 'La descripción de la moneda', maxLength: 50 })
  @Column({ type: 'varchar', length: 50 })
  descripcion: string;

  @ApiProperty({ description: 'El símbolo de la moneda', maxLength: 10 })
  @Column({ type: 'varchar', length: 10 })
  simbolo: string;

  @ApiPropertyOptional({
    description: 'Indica si es la moneda base del sistema',
    default: false,
  })
  @Column({ type: 'boolean', default: false })
  es_moneda_base: boolean;

  @ApiPropertyOptional({
    description: 'Indica si la moneda está activa',
    default: true,
  })
  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
