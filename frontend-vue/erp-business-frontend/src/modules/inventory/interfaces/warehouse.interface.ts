/**
 * A stock location. Branches (points of sale) and warehouses (storage
 * depots) share the same shape and the same transfer/stock operations,
 * so they are modeled as one entity distinguished by `type`.
 */
export interface Warehouse {
    id: string;
    codigo: string;
    name: string;
    type: 'BRANCH' | 'WAREHOUSE';
    address: string;
    responsable: string;
    sucursalId: number;
    isActive: boolean;
    permiteFacturar: boolean;
    createdAt: string;
    updatedAt: string;
}

export type WarehouseFormData = Omit<Warehouse, 'id' | 'type' | 'address' | 'createdAt' | 'updatedAt'>;
