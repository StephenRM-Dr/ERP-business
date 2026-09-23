import type { Empresa, EmpresaFormData } from './empresa.interface';

/** Raw shape returned by the NestJS `empresas` endpoints (backend/src/empresas). */
export interface EmpresaDto {
  id: number;
  nombre: string;
  siglas: string | null;
  rif: string;
  nit: string | null;
  direccion_fiscal: string | null;
  direccion_despacho: string | null;
  telefono: string | null;
  email: string | null;
  website: string | null;
}

/** Payload shape expected by POST/PATCH /empresas. */
export interface EmpresaDtoInput {
  nombre: string;
  siglas: string;
  rif: string;
  nit: string;
  direccion_fiscal: string;
  direccion_despacho: string;
  telefono: string;
  // Omitted (not sent as '') when empty — @IsOptional() only skips
  // validation for a missing key, and an empty string still fails @IsEmail().
  email?: string;
  website: string;
}

export function toEmpresa(dto: EmpresaDto): Empresa {
  return {
    id: String(dto.id),
    nombre: dto.nombre,
    siglas: dto.siglas ?? '',
    rif: dto.rif,
    nit: dto.nit ?? '',
    direccionFiscal: dto.direccion_fiscal ?? '',
    direccionDespacho: dto.direccion_despacho ?? '',
    telefono: dto.telefono ?? '',
    email: dto.email ?? '',
    website: dto.website ?? '',
  };
}

export function toEmpresaDtoInput(data: EmpresaFormData): EmpresaDtoInput {
  return {
    nombre: data.nombre,
    siglas: data.siglas,
    rif: data.rif,
    nit: data.nit,
    direccion_fiscal: data.direccionFiscal,
    direccion_despacho: data.direccionDespacho,
    telefono: data.telefono,
    email: data.email || undefined,
    website: data.website,
  };
}
