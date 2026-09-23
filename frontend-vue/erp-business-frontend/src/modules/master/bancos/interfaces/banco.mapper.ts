import type { Banco, BancoFormData } from './banco.interface';

/** Raw shape returned by the NestJS `bancos` endpoints (backend/src/bancos). */
export interface BancoDto {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

/** Payload shape expected by POST/PATCH /bancos. */
export type BancoDtoInput = BancoFormData;

export function toBanco(dto: BancoDto): Banco {
  return {
    id: String(dto.id),
    codigo: dto.codigo,
    nombre: dto.nombre,
    activo: dto.activo,
  };
}

export function toBancoDtoInput(data: BancoFormData): BancoDtoInput {
  return { ...data };
}
