import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Factura } from './factura.entity';
import { Vendedor } from '../../vendedores/entities/vendedor.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('factura_vendedores')
export class FacturaVendedor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  factura_id: number;

  @ManyToOne(() => Factura, (f) => f.facturaVendedores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'factura_id' })
  factura: Factura;

  @Column({ type: 'integer', nullable: true })
  vendedor_id: number;

  @ManyToOne(() => Vendedor, { nullable: true })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column({ type: 'integer', nullable: true })
  usuario_id: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 30, default: 'PRINCIPAL' })
  rol_en_venta: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 100 })
  porcentaje: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  monto_comision: number;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;
}
