import type { CuentaBancaria, CuentaBancariaFormData } from './cuenta-bancaria.interface';

/** Raw shape returned by the NestJS `cuentas-bancarias` endpoints (backend/src/cuentas-bancarias). */
export interface CuentaBancariaDto {
  id: number;
  banco_id: number;
  numero_cuenta: string;
  tipo_cuenta: string | null;
  moneda_id: number;
  descripcion: string | null;
  saldo_conciliado: string;
  activo: boolean;
}

/** Payload shape expected by POST/PATCH /cuentas-bancarias. */
export interface CuentaBancariaDtoInput {
  banco_id: number;
  numero_cuenta: string;
  // Omitted (not sent as '') when empty — @IsIn() rejects an empty string,
  // and @IsOptional() only skips validation for a missing key.
  tipo_cuenta?: string;
  moneda_id: number;
  descripcion: string;
  saldo_conciliado: number;
  activo: boolean;
}

export function toCuentaBancaria(dto: CuentaBancariaDto): CuentaBancaria {
  const tipoCuenta = dto.tipo_cuenta ?? '';
  return {
    id: String(dto.id),
    bancoId: dto.banco_id,
    numeroCuenta: dto.numero_cuenta,
    tipoCuenta: tipoCuenta as CuentaBancaria['tipoCuenta'],
    monedaId: dto.moneda_id,
    descripcion: dto.descripcion ?? '',
    saldoConciliado: Number(dto.saldo_conciliado),
    activo: dto.activo,
  };
}

export function toCuentaBancariaDtoInput(data: CuentaBancariaFormData): CuentaBancariaDtoInput {
  return {
    banco_id: data.bancoId,
    numero_cuenta: data.numeroCuenta,
    tipo_cuenta: data.tipoCuenta || undefined,
    moneda_id: data.monedaId,
    descripcion: data.descripcion,
    saldo_conciliado: data.saldoConciliado,
    activo: data.activo,
  };
}
