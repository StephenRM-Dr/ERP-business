import { EntityManager } from 'typeorm';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

/**
 * Resuelve la sigla estandarizada de una sucursal/tienda:
 * Caracas -> CCS
 * San Cristóbal -> SC
 * Barinas -> BNS
 * Valencia -> VLC
 * Maracaibo -> MCBO
 * Mérida -> MRD
 * Concordia -> CCD
 */
export function getSiglaSucursal(sucursal?: Partial<Sucursal> | null, esNacional?: boolean): string {
  if (esNacional) return 'NAC';
  if (!sucursal) return '';
  if (sucursal.siglas && sucursal.siglas.trim()) {
    return sucursal.siglas.trim().toUpperCase();
  }
  const text = `${sucursal.codigo || ''} ${sucursal.nombre || ''}`.toUpperCase();
  if (text.includes('NACIONAL') || text.includes('NAC')) return 'NAC';
  if (text.includes('CARACAS') || text.includes('CCS')) return 'CCS';
  if (text.includes('SAN CRISTOBAL') || text.includes('SAN CRISTÓBAL') || text.includes('SC')) return 'SC';
  if (text.includes('BARINAS') || text.includes('BNS') || text.includes('BAR')) return 'BNS';
  if (text.includes('VALENCIA') || text.includes('VLC') || text.includes('VAL')) return 'VLC';
  if (text.includes('MARACAIBO') || text.includes('MCBO') || text.includes('MAR')) return 'MCBO';
  if (text.includes('MERIDA') || text.includes('MÉRIDA') || text.includes('MRD')) return 'MRD';
  if (text.includes('CONCORDIA') || text.includes('CCD') || text.includes('CNC')) return 'CCD';
  return (sucursal.codigo || '').toUpperCase();
}

/**
 * Genera el correlativo concatenado con la sigla de la tienda o nacional:
 * Formato: [TIPO]-[SIGLA]-[NUMERO]
 * Ejemplos: FAC-NAC-00000001, DEV-NAC-00000001, FAC-CCS-00000001, RC-SC-00000001
 */
export async function generarCorrelativoDocumento(
  manager: EntityManager,
  sucursalId: number,
  codigoTipoDoc: string,
  prefijoFallback?: string,
  esNacional?: boolean,
): Promise<string> {
  let targetSucursalId = sucursalId;
  let sucursal: Sucursal | null = null;

  if (esNacional) {
    const sucursalNac = await manager.findOne(Sucursal, { where: { codigo: 'NAC' } }).catch(() => null);
    if (sucursalNac) {
      targetSucursalId = sucursalNac.id;
      sucursal = sucursalNac;
    }
  } else {
    sucursal = await manager.findOne(Sucursal, { where: { id: sucursalId } }).catch(() => null);
  }

  const sigla = esNacional ? 'NAC' : getSiglaSucursal(sucursal);

  let conf: any;
  try {
    const result = await manager.query(
      `UPDATE tipos_documentos SET correlativo_actual = correlativo_actual + 1, actualizado_en = NOW() WHERE sucursal_id = $1 AND codigo = $2 RETURNING correlativo_actual, longitud_formato, prefijo`,
      [targetSucursalId, codigoTipoDoc],
    );

    if (result && Array.isArray(result[0]) && result[0].length > 0) {
      conf = result[0][0];
    } else if (result && result[0] && typeof result[0] === 'object' && 'correlativo_actual' in result[0]) {
      conf = result[0];
    }
  } catch {
    // Si no hay tabla o falla, usar fallback
  }

  const longitud = conf?.longitud_formato ?? 8;
  const correlativoActual = conf?.correlativo_actual ?? Math.floor(10000 + Math.random() * 90000);
  const numPad = String(correlativoActual).padStart(longitud, '0');

  // Si el prefijo configurado ya tiene la sigla incrustada
  if (conf?.prefijo && conf.prefijo.includes('-') && conf.prefijo.split('-').length >= 3) {
    return `${conf.prefijo}${numPad}`;
  }

  if (sigla) {
    return `${codigoTipoDoc}-${sigla}-${numPad}`;
  }

  const pref = conf?.prefijo || prefijoFallback || `${codigoTipoDoc}-`;
  return `${pref}${numPad}`;
}
