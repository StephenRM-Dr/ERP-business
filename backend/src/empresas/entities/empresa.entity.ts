import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('empresas')
export class Empresa {
  @ApiProperty({ description: 'ID único de la empresa' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'El nombre de la empresa', maxLength: 100 })
  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @ApiPropertyOptional({ description: 'Siglas de la empresa', maxLength: 40 })
  @Column({ type: 'varchar', length: 40, nullable: true })
  siglas: string;

  @ApiProperty({ description: 'El RIF de la empresa', maxLength: 20 })
  @Column({ type: 'varchar', length: 20, unique: true })
  rif: string;

  @ApiPropertyOptional({ description: 'NIT de la empresa', maxLength: 20 })
  @Column({ type: 'varchar', length: 20, nullable: true })
  nit: string;

  @ApiPropertyOptional({ description: 'Dirección fiscal de la empresa' })
  @Column({ type: 'text', nullable: true })
  direccion_fiscal?: string;

  @ApiPropertyOptional({ description: 'Dirección de despacho' })
  @Column({ type: 'text', nullable: true })
  direccion_despacho: string;

  @ApiPropertyOptional({ description: 'Teléfono', maxLength: 40 })
  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string;

  @ApiPropertyOptional({ description: 'Email', maxLength: 100 })
  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string;

  @ApiPropertyOptional({ description: 'Sitio Web', maxLength: 100 })
  @Column({ type: 'varchar', length: 100, nullable: true })
  website: string;

  @ApiPropertyOptional({ description: 'Fecha de creación' })
  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @ApiPropertyOptional({
    description: 'Indica si el IGTF está activo para esta empresa',
  })
  @Column({ type: 'boolean', default: false })
  igtf_activo: boolean;

  @ApiPropertyOptional({ description: 'Porcentaje de IGTF' })
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0.0 })
  igtf_porcentaje: number;
}
