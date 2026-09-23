import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('seriales')
export class Serial {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ type: 'integer' }) producto_id: number;
  @ApiProperty() @Column({ type: 'varchar', length: 100, unique: true }) numero_serial: string;
  @ApiPropertyOptional() @Column({ type: 'integer', nullable: true }) deposito_id: number;
  @ApiPropertyOptional() @Column({ type: 'boolean', default: false }) vendido: boolean;
  @ApiPropertyOptional() @CreateDateColumn({ type: 'timestamp' }) creado_en: Date;
}
