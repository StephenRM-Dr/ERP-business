import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Transferencia } from './transferencia.entity';

@Entity('inventario_movimiento_detalles')
export class TransferenciaItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  movimiento_id: number;

  @Column({ type: 'integer' })
  producto_id: number;

  @Column({ type: 'integer', nullable: true })
  lote_id: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  cantidad: number;

  @Column({ type: 'numeric', precision: 18, scale: 3, default: 0 })
  peso_kg: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  cantidad_recibida: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  costo_unitario: number;

  /** Only set for manual stock adjustments (tipo AJ) — the audit-trail snapshot the adjustment modal shows on its printed document. */
  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  cantidad_anterior: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  cantidad_posterior: number | null;

  @ManyToOne(() => Transferencia, (t) => t.items)
  @JoinColumn({ name: 'movimiento_id' })
  transferencia: Transferencia;
}
