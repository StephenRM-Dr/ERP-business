import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('parametros_fiscales')
export class ParametroFiscal {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ type: 'varchar', length: 30, unique: true }) codigo: string;
  @ApiProperty() @Column({ type: 'varchar', length: 150 }) descripcion: string;
  @ApiProperty() @Column({ type: 'numeric', precision: 6, scale: 2 }) porcentaje: number;
  @ApiPropertyOptional() @Column({ type: 'boolean', default: true }) activo: boolean;
  @ApiProperty() @Column({ type: 'date', default: () => 'CURRENT_DATE' }) vigente_desde: string;
  @ApiPropertyOptional() @Column({ type: 'date', nullable: true }) vigente_hasta: string;
  @ApiPropertyOptional() @CreateDateColumn({ type: 'timestamp' }) creado_en: Date;
}
