import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('depositos')
export class Almacen {
  @ApiProperty({ description: 'ID único del almacén (depósito)' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Código único' })
  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string;

  @ApiProperty({ description: 'Nombre del almacén' })
  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @ApiPropertyOptional({ description: 'Responsable' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  responsable: string;

  @ApiProperty({ description: 'Indica si está activo' })
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ApiPropertyOptional({ description: 'Indica si este depósito permite emitir facturas', default: true })
  @Column({ type: 'boolean', default: true })
  permite_facturar: boolean;

  @ApiProperty({ description: 'ID de la sucursal' })
  @Column({ type: 'integer' })
  sucursal_id: number;

  @ManyToOne(() => Sucursal)
  @JoinColumn({ name: 'sucursal_id' })
  sucursal: Sucursal;
}
