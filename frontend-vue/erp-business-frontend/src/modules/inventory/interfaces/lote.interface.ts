/**
 * Base interface for a tracked product batch (lote).
 */
export interface Lote {
    id: string;
    productoId: number;
    numeroLote: string;
    fechaVencimiento: string;
}

/**
 * Fields collected by the create/edit form.
 */
export type LoteFormData = Omit<Lote, 'id'>;
