import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TransferenciaItem } from './transferencia-item.entity';

@Entity('inventario_movimientos')
export class Transferencia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  sucursal_id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  numero_documento: string;

  @Column({ type: 'varchar', length: 20 })
  tipo_movimiento: string; // 'TRANSFERENCIA'

  @Column({ type: 'varchar', length: 30, nullable: true })
  categoria: string;

  @Column({ type: 'integer', nullable: true })
  deposito_origen_id: number;

  @Column({ type: 'integer', nullable: true })
  deposito_destino_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  estado: string;

  @Column({ type: 'varchar', length: 100 })
  motivo: string;

  @Column({ type: 'integer' })
  usuario_id: number;

  @Column({ type: 'numeric', precision: 18, scale: 3, default: 0 })
  peso_total_kg: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  documento_origen: string | null;

  @Column({ type: 'integer', nullable: true })
  movimiento_origen_id: number | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_operacion: Date;

  @OneToMany(() => TransferenciaItem, (item) => item.transferencia, {
    cascade: true,
  })
  items: TransferenciaItem[];
}
