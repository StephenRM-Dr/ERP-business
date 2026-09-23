import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Producto } from '../../productos/entities/producto.entity';
import { Almacen } from '../../almacenes/entities/almacen.entity';

@Entity('inventario_stock')
export class Stock {
  @ApiProperty({ description: 'ID único del registro de stock' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID del producto' })
  @Column({ type: 'integer' })
  producto_id: number;

  @ApiProperty({ description: 'ID del depósito/almacén' })
  @Column({ type: 'integer' })
  deposito_id: number;

  @ApiPropertyOptional({ description: 'ID del lote si aplica' })
  @Column({ type: 'integer', nullable: true })
  lote_id: number;

  @ApiProperty({ description: 'Cantidad en existencia' })
  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  existencia: number;

  @ApiProperty({ description: 'Cantidad reservada' })
  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  reservado: number;

  @ApiPropertyOptional({ description: 'Ubicación en el estante' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  ubicacion_estante: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @ManyToOne(() => Almacen)
  @JoinColumn({ name: 'deposito_id' })
  almacen: Almacen;
}
