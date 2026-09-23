import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '@/api/axios-client';
import type {
  ResumenClienteCxC,
  MovimientoCxC,
  CreateDocumentoCxCPayload,
  AplicarDocumentosCxCPayload,
  PagoDirectoCxCPayload,
} from './cuenta-cobrar.interface';
import { useCustomerStore } from '@/modules/customers/interfaces/customer.store';

export const useCuentasCobrarStore = defineStore('cuentasCobrar', () => {
  const selectedClienteId = ref<number | null>(null);
  const resumen = ref<ResumenClienteCxC | null>(null);
  const isLoading = ref<boolean>(false);
  const isActionLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const actionSuccessMessage = ref<string | null>(null);

  const customerStore = useCustomerStore();

  async function fetchResumenCliente(clienteId: number): Promise<void> {
    selectedClienteId.value = clienteId;
    isLoading.value = true;
    error.value = null;

    // 1. Intentar endpoint dedicado del backend
    try {
      const { data } = await apiClient.get<ResumenClienteCxC>(`/cuentas-cobrar/cliente/${clienteId}/resumen`);
      resumen.value = data;
      isLoading.value = false;
      return;
    } catch {
      // Fallback si el backend está reiniciándose o no tiene la ruta cargada en memoria
    }

    // 2. Fallback de cálculo en frontend
    try {
      if (customerStore.customerList.length === 0) {
        await customerStore.fetchCustomers();
      }
      const cliente = customerStore.getCustomerById(String(clienteId));

      const [cxcRes, recibosRes] = await Promise.all([
        apiClient.get<any[]>('/cuentas-cobrar', { params: { cliente_id: clienteId } }).catch(() => ({ data: [] })),
        apiClient.get<any[]>('/recibos-cobro').catch(() => ({ data: [] })),
      ]);

      const cxcList = cxcRes.data || [];
      const recibosList = (recibosRes.data || []).filter((r: any) => Number(r.cliente_id || r.clienteId) === clienteId);

      const movimientos: MovimientoCxC[] = [];

      for (const c of cxcList) {
        const tipo = (c.tipo_documento || c.tipoDocumento || 'FACTURA').toUpperCase();
        const monto = Number(c.monto_original ?? c.montoOriginal ?? 0);
        const saldo = Number(c.saldo_pendiente ?? c.saldoPendiente ?? 0);

        let debito = 0;
        let credito = 0;
        let tipoLabel = tipo;

        if (tipo === 'FACTURA') {
          debito = monto;
          tipoLabel = 'FACTURA';
        } else if (tipo === 'NOTA_DEBITO') {
          debito = monto;
          tipoLabel = 'NOTA DE DÉBITO';
        } else if (tipo === 'GIRO') {
          debito = monto;
          tipoLabel = 'GIRO';
        } else if (tipo === 'NOTA_CREDITO' || tipo === 'DEVOLUCION') {
          credito = monto;
          tipoLabel = tipo === 'DEVOLUCION' ? 'DEVOLUCIÓN' : 'NOTA DE CRÉDITO';
        } else if (tipo === 'ADELANTO') {
          credito = monto;
          tipoLabel = 'PAGO ADELANTADO (ANTICIPO)';
        } else if (tipo === 'AJUSTE') {
          debito = monto;
          tipoLabel = 'AJUSTE';
        }

        movimientos.push({
          id: `cxc-${c.id}`,
          tipo,
          tipoLabel,
          documentoNumero: c.numero_documento || c.numeroDocumento || (c.factura ? c.factura.numero_factura : `DOC-${c.id}`),
          documentoOrigen: c.factura ? c.factura.numero_factura : null,
          fecha: c.fecha_emision || c.fechaEmision || c.creado_en || new Date().toISOString(),
          fechaVencimiento: c.fecha_vencimiento || c.fechaVencimiento || null,
          descripcion: c.factura ? `Factura de Venta #${c.factura.numero_factura}` : `${tipoLabel} #${c.numero_documento || c.id}`,
          monedaId: c.moneda_id || c.monedaId || 1,
          tasaCambio: Number(c.tasa_cambio || c.tasaCambio || 1),
          debito,
          credito,
          saldoPendiente: saldo,
          status: c.status || 'PENDIENTE',
        });
      }

      for (const r of recibosList) {
        const monto = Number(r.monto_total ?? r.montoTotal ?? 0);
        movimientos.push({
          id: `recibo-${r.id}`,
          tipo: 'PAGO',
          tipoLabel: 'PAGO / RECIBO DE COBRO',
          documentoNumero: r.numero_recibo || r.numeroRecibo || `RC-${r.id}`,
          documentoOrigen: null,
          fecha: r.fecha_pago || r.fechaPago || r.creado_en || new Date().toISOString(),
          fechaVencimiento: null,
          descripcion: `Recibo de Cobro [${r.forma_pago || r.formaPago || 'TRANSFERENCIA'}]`,
          monedaId: r.moneda_pago_id || r.monedaPagoId || 1,
          tasaCambio: Number(r.tasa_cambio || r.tasaCambio || 1),
          debito: 0,
          credito: monto,
          saldoPendiente: 0,
          status: 'PAGADO',
        });
      }

      movimientos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

      let totalDebitos = 0;
      let totalCreditos = 0;
      let totalAdelantos = 0;
      let totalDevoluciones = 0;
      let saldoConsolidado = 0;

      for (const c of cxcList) {
        const tipo = (c.tipo_documento || c.tipoDocumento || '').toUpperCase();
        const saldo = Number(c.saldo_pendiente ?? c.saldoPendiente ?? 0);
        const monto = Number(c.monto_original ?? c.montoOriginal ?? 0);

        if (['FACTURA', 'NOTA_DEBITO', 'GIRO', 'AJUSTE'].includes(tipo)) {
          totalDebitos += monto;
          saldoConsolidado += saldo;
        } else if (tipo === 'ADELANTO') {
          if (c.status === 'PENDIENTE' && saldo > 0) totalAdelantos += saldo;
          totalCreditos += monto;
          saldoConsolidado -= saldo;
        } else if (tipo === 'NOTA_CREDITO' || tipo === 'DEVOLUCION') {
          if (c.status === 'PENDIENTE' && saldo > 0) totalDevoluciones += saldo;
          totalCreditos += monto;
          saldoConsolidado -= saldo;
        }
      }

      for (const r of recibosList) {
        totalCreditos += Number(r.monto_total ?? r.montoTotal ?? 0);
      }

      resumen.value = {
        cliente: {
          id: clienteId,
          codigo: cliente ? `${cliente.documentType}-${cliente.documentNumber}` : String(clienteId),
          nombre: cliente ? `${cliente.firstName} ${cliente.lastName}`.trim() : `Cliente #${clienteId}`,
          tipoDocumento: cliente?.documentType || 'V',
          numeroDocumento: cliente?.documentNumber || String(clienteId),
          direccion: cliente?.notes || '',
          telefono: cliente?.phone || '',
          email: cliente?.email || '',
        },
        totales: {
          adelantos: Math.max(0, totalAdelantos),
          apartados: 0,
          devolucionesPendientes: Math.max(0, totalDevoluciones),
          debitos: totalDebitos,
          creditos: totalCreditos,
          saldo: Math.max(0, saldoConsolidado),
        },
        movimientos,
      };
    } catch (err: any) {
      error.value = err?.message || 'Error al cargar el resumen del cliente';
      resumen.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  async function createDocumento(payload: CreateDocumentoCxCPayload): Promise<boolean> {
    isActionLoading.value = true;
    error.value = null;
    try {
      await apiClient.post('/cuentas-cobrar/documento', payload);
      actionSuccessMessage.value = `Documento ${payload.tipo_documento} registrado exitosamente.`;
      if (selectedClienteId.value) {
        await fetchResumenCliente(selectedClienteId.value);
      }
      return true;
    } catch (err: any) {
      error.value = err?.response?.data?.message || 'Error al registrar el documento';
      return false;
    } finally {
      isActionLoading.value = false;
    }
  }

  async function aplicarDocumentos(payload: AplicarDocumentosCxCPayload): Promise<boolean> {
    isActionLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.post<{ success: boolean; mensaje: string }>('/cuentas-cobrar/aplicar-documentos', payload);
      actionSuccessMessage.value = data.mensaje || 'Documentos aplicados correctamente.';
      if (selectedClienteId.value) {
        await fetchResumenCliente(selectedClienteId.value);
      }
      return true;
    } catch (err: any) {
      error.value = err?.response?.data?.message || 'Error al aplicar los documentos';
      return false;
    } finally {
      isActionLoading.value = false;
    }
  }

  async function registrarPagoDirecto(payload: PagoDirectoCxCPayload): Promise<boolean> {
    isActionLoading.value = true;
    error.value = null;
    try {
      await apiClient.post('/cuentas-cobrar/pago-directo', payload);
      actionSuccessMessage.value = 'Pago registrado exitosamente.';
      if (selectedClienteId.value) {
        await fetchResumenCliente(selectedClienteId.value);
      }
      return true;
    } catch (err: any) {
      error.value = err?.response?.data?.message || 'Error al registrar el pago';
      return false;
    } finally {
      isActionLoading.value = false;
    }
  }

  async function anularUltimaOperacion(clienteId: number): Promise<boolean> {
    isActionLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.post<{ success: boolean; mensaje: string }>(`/cuentas-cobrar/cliente/${clienteId}/anular-ultima`);
      actionSuccessMessage.value = data.mensaje || 'Última operación anulada correctamente.';
      await fetchResumenCliente(clienteId);
      return true;
    } catch (err: any) {
      error.value = err?.response?.data?.message || 'Error al anular la última operación';
      return false;
    } finally {
      isActionLoading.value = false;
    }
  }

  async function cruzarDevolucionesAutomatico(clienteId: number): Promise<boolean> {
    isActionLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.post<{ success: boolean; mensaje: string; totalCruzado: number }>(
        `/cuentas-cobrar/cliente/${clienteId}/cruzar-devoluciones-auto`,
      );
      actionSuccessMessage.value = data.mensaje || 'Devoluciones cruzadas automáticamente con éxito.';
      await fetchResumenCliente(clienteId);
      return true;
    } catch (err: any) {
      error.value = err?.response?.data?.message || 'Error al cruzar las devoluciones automáticamente';
      return false;
    } finally {
      isActionLoading.value = false;
    }
  }

  async function anularDocumentoEspecifico(tipo: string, id: number): Promise<boolean> {
    isActionLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.delete<{ success: boolean; mensaje: string }>(`/cuentas-cobrar/documento/${tipo}/${id}`);
      actionSuccessMessage.value = data.mensaje || 'Documento anulado y saldos actualizados correctamente.';
      if (selectedClienteId.value) {
        await fetchResumenCliente(selectedClienteId.value);
      }
      return true;
    } catch (err: any) {
      error.value = err?.response?.data?.message || 'Error al anular el documento';
      return false;
    } finally {
      isActionLoading.value = false;
    }
  }

  function clearResumen(): void {
    selectedClienteId.value = null;
    resumen.value = null;
    error.value = null;
    actionSuccessMessage.value = null;
  }

  return {
    selectedClienteId,
    resumen,
    isLoading,
    isActionLoading,
    error,
    actionSuccessMessage,
    fetchResumenCliente,
    createDocumento,
    aplicarDocumentos,
    registrarPagoDirecto,
    anularUltimaOperacion,
    cruzarDevolucionesAutomatico,
    anularDocumentoEspecifico,
    clearResumen,
  };
});
