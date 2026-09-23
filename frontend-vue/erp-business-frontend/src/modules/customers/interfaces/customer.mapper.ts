import type { Customer, CustomerFormData } from './customer.interface';

/**
 * Raw shape returned by the NestJS `clientes` endpoints (backend/src/clientes).
 * Field names are snake_case and numeric columns come back as strings from pg.
 */
export interface ClienteDto {
  id: number;
  nombre: string;
  apellido: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  email: string | null;
  telefono: string | null;
  limite_credito: string;
  dias_credito: number;
  notas: string | null;
  contribuyente_especial: boolean;
}

/** Payload shape expected by POST/PATCH /clientes. */
export type ClienteDtoInput = Omit<ClienteDto, 'id' | 'limite_credito' | 'email'> & {
  limite_credito?: number;
  // Must be omitted (not null/'') when absent — the backend DTO's @IsOptional()
  // only skips validation for a missing key, not an empty/null value.
  email?: string;
};

export function toCustomer(dto: ClienteDto): Customer {
  return {
    id: String(dto.id),
    documentType: dto.tipo_documento ?? '',
    documentNumber: dto.numero_documento ?? '',
    firstName: dto.nombre,
    lastName: dto.apellido ?? '',
    phone: dto.telefono ?? '',
    email: dto.email ?? '',
    creditLimit: Number(dto.limite_credito),
    paymentTermsDays: dto.dias_credito,
    notes: dto.notas ?? '',
    isSpecialTaxpayer: dto.contribuyente_especial,
    // The `clientes` table has no timestamp columns yet — backend gap, not a mapping bug.
    createdAt: '',
    updatedAt: '',
  };
}

export function toClienteDtoInput(data: CustomerFormData): ClienteDtoInput {
  return {
    tipo_documento: data.documentType,
    numero_documento: data.documentNumber,
    nombre: data.firstName,
    apellido: data.lastName,
    telefono: data.phone,
    // The backend DTO only treats email as optional when the key is absent —
    // an empty string still fails its @IsEmail() check, so omit it instead.
    email: data.email || undefined,
    limite_credito: data.creditLimit,
    dias_credito: data.paymentTermsDays,
    notas: data.notes,
    contribuyente_especial: data.isSpecialTaxpayer,
  };
}
