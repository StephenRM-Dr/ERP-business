import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('vendedores')
export class Vendedor {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ type: 'varchar', length: 30, unique: true }) codigo: string;
  @ApiProperty() @Column({ type: 'varchar', length: 100 }) nombre: string;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 100, nullable: true }) email: string;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 40, nullable: true }) telefono: string;
  @ApiPropertyOptional() @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 }) comision_porcentaje: number;
  @ApiPropertyOptional() @Column({ type: 'boolean', default: true }) activo: boolean;
  @ApiPropertyOptional() @Column({ type: 'integer', nullable: true }) sucursal_id: number;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 20, default: 'TIENDA' }) canal: string;
}
