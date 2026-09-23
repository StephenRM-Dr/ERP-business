import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('pagos_proveedores')
export class PagoProveedor {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ type: 'integer' }) proveedor_id: number;
  @ApiProperty() @Column({ type: 'integer' }) sucursal_id: number;
  @ApiProperty() @Column({ type: 'varchar', length: 30, unique: true }) numero_pago: string;
  @ApiProperty() @CreateDateColumn({ type: 'timestamp' }) fecha_pago: Date;
  @ApiProperty() @Column({ type: 'varchar', length: 30, default: 'TRANSFERENCIA' }) forma_pago: string;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) monto_total: number;
  @ApiProperty() @Column({ type: 'integer' }) moneda_pago_id: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) tasa_cambio: number;
  @ApiProperty() @Column({ type: 'boolean', default: false }) aplica_igtf: boolean;
  @ApiProperty() @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 }) igtf_porcentaje: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 }) igtf_monto: number;
  @ApiProperty() @Column({ type: 'integer' }) cuenta_bancaria_id: number;
  @ApiProperty() @Column({ type: 'integer' }) usuario_id: number;
  @ApiPropertyOptional() @Column({ type: 'text', nullable: true }) observaciones: string;
  @ApiPropertyOptional() @Column({ type: 'integer', nullable: true }) metodo_pago_id: number;
}

@Entity('pago_proveedor_detalles')
export class PagoProveedorDetalle {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ type: 'integer' }) pago_id: number;
  @ApiProperty() @Column({ type: 'integer' }) cxp_id: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) monto_aplicado: number;
}
