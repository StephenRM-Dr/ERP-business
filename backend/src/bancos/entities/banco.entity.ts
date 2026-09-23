import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('bancos')
export class Banco {
  @ApiProperty({ description: 'ID único del banco' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Código del banco', maxLength: 20 })
  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @ApiProperty({ description: 'El nombre del banco', maxLength: 100 })
  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Indica si el banco está activo',
    default: true,
  })
  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
