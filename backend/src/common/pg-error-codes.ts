/**
 * Códigos de error PostgreSQL usados en los servicios.
 * Centralizado aquí para que un solo cambio cubra todos los módulos
 * si TypeORM modifica cómo envuelve el error de driver.
 */
export const PG_UNIQUE = '23505'; // unique_violation
export const PG_FK = '23503';     // foreign_key_violation

export const pgCode = (e: any): string | undefined =>
  e?.code ?? e?.driverError?.code;
