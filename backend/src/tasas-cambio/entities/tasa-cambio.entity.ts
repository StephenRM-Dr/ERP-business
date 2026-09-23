import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('tasas_cambio')
@Unique('uq_moneda_fecha', ['moneda_id', 'fecha_tasa'])
export class TasaCambio {
  @ApiProperty({ description: 'ID de la tasa de cambio' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID de la moneda' })
  @Column({ type: 'int' })
  moneda_id: number;

  @ApiProperty({
    description: 'Fecha de la tasa',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_tasa: Date;

  @ApiProperty({ description: 'Factor de cambio' })
  @Column({ type: 'numeric', precision: 24, scale: 18 })
  factor: number;

  @ApiPropertyOptional({ description: 'ID del usuario que registró la tasa' })
  @Column({ type: 'int', nullable: true })
  usuario_id: number;
}
