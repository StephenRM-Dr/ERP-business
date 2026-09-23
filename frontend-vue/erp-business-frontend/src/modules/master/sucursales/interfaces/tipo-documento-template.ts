/**
 * Standard document-type catalog every sucursal needs to issue invoices,
 * returns and transfers — mirrors what "Sucursal Principal" (id 1) already
 * has configured. Used to pre-fill the catalog step when creating a new
 * sucursal, so it isn't left without tipos_documentos rows (the root cause
 * of "Tipo de documento FAC no configurado para esta sucursal").
 */
export interface TipoDocumentoTemplateItem {
  codigo: string;
  nombre: string;
  /** Editable by the admin; empty means the correlativo prints with no prefix. */
  prefijo: string;
}

export const TIPO_DOCUMENTO_TEMPLATE: readonly TipoDocumentoTemplateItem[] = [
  { codigo: 'FAC', nombre: 'Factura', prefijo: '' },
  { codigo: 'FACN', nombre: 'Factura Nacional', prefijo: '' },
  { codigo: 'C', nombre: 'Cargo', prefijo: '' },
  { codigo: 'D', nombre: 'Descargo', prefijo: '' },
  { codigo: 'AJ', nombre: 'Ajuste', prefijo: '' },
  { codigo: 'DEV', nombre: 'Devolución', prefijo: '' },
  { codigo: 'DEVN', nombre: 'Devolución Nacional', prefijo: '' },
  { codigo: 'TR', nombre: 'Transferencia entre Sucursales', prefijo: '' },
];
