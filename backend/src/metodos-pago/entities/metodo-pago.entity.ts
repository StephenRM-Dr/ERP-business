import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Moneda } from '../../monedas/entities/moneda.entity';

@Entity('metodos_pago')
export class MetodoPago {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column()
  moneda_id: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ default: false })
  requiere_cuenta_bancaria: boolean;

  @ManyToOne(() => Moneda)
  @JoinColumn({ name: 'moneda_id' })
  moneda: Moneda;
}
