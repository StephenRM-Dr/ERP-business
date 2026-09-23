import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('categorias')
export class Categoria {
  @ApiProperty({ description: 'ID único de la categoría' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'El código de la categoría', maxLength: 30 })
  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string;

  @ApiProperty({ description: 'El nombre de la categoría', maxLength: 100 })
  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción de la categoría' })
  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @ApiPropertyOptional({
    description: 'Indica si la categoría está activa',
    default: true,
  })
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ApiPropertyOptional({ description: 'Fecha de creación' })
  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;
}
