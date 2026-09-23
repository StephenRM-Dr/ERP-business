import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('proveedores')
export class Proveedor {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ type: 'varchar', length: 30, unique: true }) codigo: string;
  @ApiProperty() @Column({ type: 'varchar', length: 150 }) nombre: string;
  @ApiProperty() @Column({ type: 'varchar', length: 20, unique: true }) rif: string;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 20, nullable: true }) nit: string;
  @ApiProperty() @Column({ type: 'text' }) direccion: string;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 40, nullable: true }) telefono: string;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 100, nullable: true }) email: string;
  @ApiProperty() @Column({ type: 'integer' }) moneda_cuenta_id: number;
  @ApiPropertyOptional() @Column({ type: 'integer', default: 0 }) dias_credito: number;
  @ApiPropertyOptional() @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 }) saldo_actual: number;
  @ApiPropertyOptional() @Column({ type: 'boolean', default: true }) activo: boolean;
  @ApiPropertyOptional() @CreateDateColumn({ type: 'timestamp' }) creado_en: Date;
}
