import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Factura } from './factura.entity';

@Entity('factura_venta_detalles')
export class FacturaItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  factura_id: number;

  @Column({ type: 'integer' })
  producto_id: number;

  @Column({ type: 'integer' })
  deposito_id: number;

  @Column({ type: 'integer', nullable: true })
  lote_id: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  cantidad: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  precio_unitario: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  descuento_porcentaje: number;

  @Column({ type: 'boolean', default: false })
  es_exento: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  impuesto_porcentaje: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  monto_iva_linea: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  neto_linea: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  costo_operacion: number;

  @ManyToOne(() => Factura, (f) => f.items)
  @JoinColumn({ name: 'factura_id' })
  factura: Factura;
}
