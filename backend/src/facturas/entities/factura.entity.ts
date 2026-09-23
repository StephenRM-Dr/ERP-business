import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { FacturaItem } from './factura-item.entity';
import { CuentaCobrar } from './cuenta-cobrar.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Vendedor } from '../../vendedores/entities/vendedor.entity';
import { FacturaVendedor } from './factura-vendedor.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';

@Entity('facturas_ventas')
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  sucursal_id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  numero_factura: string;

  @Column({ type: 'varchar', length: 30, unique: true, nullable: true })
  numero_control: string;

  @Column({ type: 'integer' })
  cliente_id: number;

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_emision: Date;

  @Column({ type: 'date' })
  fecha_vencimiento: string;

  @Column({ type: 'integer' })
  moneda_id: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 1 })
  tasa_cambio: number;

  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  status: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  total_bruto: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  descuento_monto: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  base_exenta: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  base_imponible: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  monto_iva: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  igtf_porcentaje: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  igtf_monto: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  total_neto: number;

  @Column({ type: 'integer' })
  usuario_id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'boolean', default: false })
  aplica_retencion_iva: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  porcentaje_retencion_iva: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  monto_retencion_iva: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  monto_iva_cobrado: number;

  @Column({ type: 'integer', nullable: true })
  vendedor_id: number;

  @ManyToOne(() => Vendedor, { nullable: true })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 100 })
  porcentaje_vendedor_1: number;

  @Column({ type: 'integer', nullable: true })
  vendedor_secundario_id: number;

  @ManyToOne(() => Vendedor, { nullable: true })
  @JoinColumn({ name: 'vendedor_secundario_id' })
  vendedor_secundario: Vendedor;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  porcentaje_vendedor_2: number;

  @OneToMany(() => FacturaVendedor, (fv) => fv.factura, { cascade: true })
  facturaVendedores: FacturaVendedor[];

  @OneToMany(() => FacturaItem, (item) => item.factura, { cascade: true })
  items: FacturaItem[];

  @OneToOne(() => CuentaCobrar, (cxc) => cxc.factura)
  cxc: CuentaCobrar;
}
