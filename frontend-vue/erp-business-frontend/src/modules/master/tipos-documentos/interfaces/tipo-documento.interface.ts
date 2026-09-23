/**
 * Base interface for a document type (invoice/return/transfer numbering
 * series), scoped to a branch. Backend: backend/src/tipos-documentos.
 */
export interface TipoDocumento {
  id: string;
  sucursalId: number;
  codigo: string;
  nombre: string;
  correlativoActual: number;
  longitudFormato: number;
  prefijo: string;
  activo: boolean;
}

/**
 * Fields collected by the create/edit form.
 */
export type TipoDocumentoFormData = Omit<TipoDocumento, 'id'>;
