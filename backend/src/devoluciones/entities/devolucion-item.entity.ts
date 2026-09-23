import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Devolucion } from './devolucion.entity';

@Entity('devolucion_venta_detalles')
export class DevolucionItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  devolucion_id: number;

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

  @Column({ type: 'boolean', default: false })
  es_exento: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  impuesto_porcentaje: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  monto_iva_linea: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  neto_linea: number;

  @ManyToOne(() => Devolucion, (d) => d.items)
  @JoinColumn({ name: 'devolucion_id' })
  devolucion: Devolucion;
}
