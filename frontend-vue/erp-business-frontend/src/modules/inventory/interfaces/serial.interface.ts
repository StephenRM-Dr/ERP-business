/**
 * Base interface for a tracked product serial number.
 */
export interface Serial {
    id: string;
    productoId: number;
    numeroSerial: string;
    depositoId: number | null;
    vendido: boolean;
}

/**
 * Fields collected by the create/edit form.
 */
export type SerialFormData = Omit<Serial, 'id'>;
