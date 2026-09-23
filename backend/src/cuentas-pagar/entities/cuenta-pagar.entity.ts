import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('cuentas_pagar')
export class CuentaPagar {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ type: 'integer' }) proveedor_id: number;
  @ApiProperty() @Column({ type: 'varchar', length: 20 }) tipo_documento: string;
  @ApiProperty() @Column({ type: 'varchar', length: 40 }) numero_documento: string;
  @ApiPropertyOptional() @Column({ type: 'integer', nullable: true }) compra_id: number;
  @ApiProperty() @CreateDateColumn({ type: 'timestamp' }) fecha_emision: Date;
  @ApiProperty() @Column({ type: 'date' }) fecha_vencimiento: string;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) monto_original: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) saldo_pendiente: number;
  @ApiProperty() @Column({ type: 'integer' }) moneda_id: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) tasa_cambio: number;
  @ApiProperty() @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' }) status: string;
  @ApiPropertyOptional() @CreateDateColumn({ type: 'timestamp' }) creado_en: Date;
}
