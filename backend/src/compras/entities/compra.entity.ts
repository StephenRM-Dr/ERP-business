import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('facturas_compras')
export class FacturaCompra {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ type: 'integer' }) sucursal_id: number;
  @ApiProperty() @Column({ type: 'varchar', length: 40 }) numero_factura: string;
  @ApiProperty() @Column({ type: 'integer' }) proveedor_id: number;
  @ApiProperty() @CreateDateColumn({ type: 'timestamp' }) fecha_emision: Date;
  @ApiProperty() @Column({ type: 'date' }) fecha_vencimiento: string;
  @ApiProperty() @Column({ type: 'integer' }) moneda_id: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) tasa_cambio: number;
  @ApiProperty() @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' }) status: string;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) total_bruto: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 }) base_exenta: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 }) base_imponible: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 }) monto_iva: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 }) igtf_porcentaje: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 }) igtf_monto: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) total_neto: number;
  @ApiProperty() @Column({ type: 'integer' }) usuario_id: number;
  @ApiPropertyOptional() @Column({ type: 'text', nullable: true }) observaciones: string;
}

@Entity('factura_compra_detalles')
export class FacturaCompraDetalle {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ type: 'integer' }) compra_id: number;
  @ApiProperty() @Column({ type: 'integer' }) producto_id: number;
  @ApiProperty() @Column({ type: 'integer' }) deposito_id: number;
  @ApiPropertyOptional() @Column({ type: 'integer', nullable: true }) lote_id: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) cantidad: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) costo_unitario: number;
  @ApiProperty() @Column({ type: 'boolean', default: false }) es_exento: boolean;
  @ApiProperty() @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 }) impuesto_porcentaje: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 }) monto_iva_linea: number;
  @ApiProperty() @Column({ type: 'numeric', precision: 18, scale: 2 }) neto_linea: number;
}
