// Las entidades ReciboCobro y ReciboCobroDetalle ya están definidas en
// src/facturas/entities/ porque se generan como subproducto del flujo de facturación.
// Este módulo re-exporta las mismas tablas para exponer un endpoint dedicado.
export { ReciboCobro } from '../../facturas/entities/recibo-cobro.entity';
export { ReciboCobroDetalle } from '../../facturas/entities/recibo-cobro-detalle.entity';
