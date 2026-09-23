import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Rol } from '../../roles/entities/rol.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('usuarios')
export class Usuario {
  @ApiProperty({ description: 'ID único del usuario' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'El nombre de usuario para login',
    maxLength: 40,
  })
  @Column({ type: 'varchar', length: 40, unique: true })
  username: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  clave_hash: string;

  @ApiProperty({
    description: 'El nombre completo del usuario',
    maxLength: 100,
  })
  @Column({ type: 'varchar', length: 100 })
  nombre_completo: string;

  @ApiPropertyOptional({ description: 'El email del usuario', maxLength: 100 })
  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  email: string;

  @ApiPropertyOptional({ description: 'El ID del rol del usuario' })
  @Column({ type: 'int', nullable: true })
  rol_id: number;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @ApiPropertyOptional({ description: 'El ID de la sucursal del usuario' })
  @Column({ type: 'int', nullable: true })
  sucursal_id: number;

  @ManyToOne(() => Sucursal)
  @JoinColumn({ name: 'sucursal_id' })
  sucursal: Sucursal;

  @ApiPropertyOptional({
    description: 'Indica si el usuario está activo',
    default: true,
  })
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ApiPropertyOptional({ description: 'Versión de la sesión actual' })
  @Column({ type: 'int', default: 1 })
  sesion_version: number;

  @ApiPropertyOptional({ description: 'Fecha del último acceso' })
  @Column({ type: 'timestamp', nullable: true })
  ultimo_acceso: Date;

  @ApiPropertyOptional({ description: 'Fecha de creación' })
  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;
}
