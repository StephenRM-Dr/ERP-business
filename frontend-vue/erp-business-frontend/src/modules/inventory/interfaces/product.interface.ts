/**
 * Base interface for a product.
 */
export interface Product {
    id: string;
    codigo: string;
    nombre: string;
    descripcionDetallada: string;
    categoriaId: number;
    monedaBaseId: number;
    unidadMedida: string; // e.g. 'UND', 'MT', 'ROLLO', 'CAJA', 'PAQUETE'
    pesoKg: number; // Peso por unidad de venta; base para el cálculo de despacho y flete.
    activo: boolean;
    createdAt: string;
    // Optional in the backend — can stay empty while the catalog is filled in over time.
    referencia: string;
    marca: string;
    modelo: string;
    precioCosto: number | null;
    precioVenta: number | null;
    monedaVentaId: number | null;
    impuestoPorcentaje: number | null;
    capacidadContenido: number | null;
    montoComision: number | null;
    departamentoId: number | null;
    manejaLotes: boolean;
    manejaSeriales: boolean;
    permiteDecimales: boolean;
    sujetoComisionFija: boolean;
    precios?: ProductPrecioItem[];
    /** Last modification audit trail — read-only, set by the backend. */
    updatedAt: string;
    updatedByName: string | null;
}

export interface ProductPrecioItem {
    id: number;
    nivelPrecioId: number;
    monedaId: number;
    precio: number;
    activo: boolean;
}

/**
 * Fields collected by the create/edit form.
 */
export type ProductFormData = Omit<
  Product,
  'id' | 'createdAt' | 'updatedAt' | 'updatedByName'
>;
