import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Empresa } from '../../empresas/entities/empresa.entity';

@Entity('sucursales')
export class Sucursal {
  @ApiProperty({ description: 'ID único de la sucursal' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'El ID de la empresa a la que pertenece' })
  @Column({ type: 'int' })
  empresa_id: number;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @ApiProperty({ description: 'El código de la sucursal', maxLength: 20 })
  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @ApiPropertyOptional({
    description: 'Siglas de la sucursal — por defecto hereda las de su empresa, editable después',
    maxLength: 40,
  })
  @Column({ type: 'varchar', length: 40, nullable: true })
  siglas: string;

  @ApiProperty({ description: 'El nombre de la sucursal', maxLength: 100 })
  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @ApiPropertyOptional({ description: 'Dirección de la sucursal' })
  @Column({ type: 'text', nullable: true })
  direccion: string;

  @ApiPropertyOptional({ description: 'Teléfono', maxLength: 40 })
  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string;

  @ApiPropertyOptional({
    description: 'Indica si la sucursal está activa',
    default: true,
  })
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ApiPropertyOptional({ description: 'Fecha de creación' })
  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;
}
