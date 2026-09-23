<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useSucursalStore } from '@/modules/master/sucursales/interfaces/sucursal.store';
import { formatMoney } from '@/utils/money';
import { useAnulacionesStore } from '../anulaciones.store';
import type {
  DocumentoResumenItem,
  QueryDocumentosFilter,
  TipoDocumentoAnulable,
} from '../interfaces/anulacion.interface';

const { t } = useI18n();
const authStore = useAuthStore();
const sucursalStore = useSucursalStore();
const anulacionesStore = useAnulacionesStore();

// Filtros
const filters = reactive<QueryDocumentosFilter>({
  tipo_documento: 'FACTURA_VENTA',
  sucursal_id: undefined,
  fecha_desde: '',
  fecha_hasta: '',
  search: '',
  solo_activos: true,
});

// Selección múltiple
const selectedIds = ref<number[]>([]);

// Modal de confirmación
const isModalOpen = ref(false);
const modalMode = ref<'INDIVIDUAL' | 'LOTE'>('LOTE');
const singleDocTarget = ref<DocumentoResumenItem | null>(null);
const motivoAnulacion = ref('');
const adminPassword = ref('');
const modalError = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const esSuperAdmin = computed(() => authStore.user?.rolId === 1);

const TIPOS_DOCUMENTOS: Array<{ value: TipoDocumentoAnulable; label: string }> = [
  { value: 'FACTURA_VENTA', label: 'Facturas de Venta' },
  { value: 'FACTURA_COMPRA', label: 'Facturas de Compra' },
  { value: 'DEVOLUCION_VENTA', label: 'Devoluciones de Venta' },
  { value: 'RECIBO_COBRO', label: 'Recibos de Cobro (CxC)' },
  { value: 'PAGO_PROVEEDOR', label: 'Pagos a Proveedores (CxP)' },
  { value: 'TRANSFERENCIA', label: 'Transferencias de Inventario' },
];

const selectedCount = computed(() => selectedIds.value.length);

const anulablesList = computed(() =>
  anulacionesStore.documentos.filter((d) => d.es_anulable),
);

const isAllSelected = computed(
  () =>
    anulablesList.value.length > 0 &&
    anulablesList.value.every((d) => selectedIds.value.includes(d.id)),
);

function toggleSelectAll(): void {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = anulablesList.value.map((d) => d.id);
  }
}

function toggleSelectRow(id: number): void {
  const index = selectedIds.value.indexOf(id);
  if (index >= 0) {
    selectedIds.value.splice(index, 1);
  } else {
    selectedIds.value.push(id);
  }
}

async function handleSearch(): Promise<void> {
  selectedIds.value = [];
  successMessage.value = null;
  await anulacionesStore.fetchDocumentos(filters);
}

function openSingleModal(doc: DocumentoResumenItem): void {
  modalMode.value = 'INDIVIDUAL';
  singleDocTarget.value = doc;
  motivoAnulacion.value = '';
  adminPassword.value = '';
  modalError.value = null;
  isModalOpen.value = true;
}

function openBatchModal(): void {
  if (selectedIds.value.length === 0) return;
  modalMode.value = 'LOTE';
  singleDocTarget.value = null;
  motivoAnulacion.value = '';
  adminPassword.value = '';
  modalError.value = null;
  isModalOpen.value = true;
}

function closeModal(): void {
  isModalOpen.value = false;
  singleDocTarget.value = null;
  motivoAnulacion.value = '';
  adminPassword.value = '';
  modalError.value = null;
}

async function confirmAnulacion(): Promise<void> {
  modalError.value = null;
  successMessage.value = null;

  if (!motivoAnulacion.value.trim() || motivoAnulacion.value.trim().length < 3) {
    modalError.value = 'Debe indicar un motivo de anulación válido (mínimo 3 caracteres).';
    return;
  }

  if (!esSuperAdmin.value && !adminPassword.value) {
    modalError.value = 'Debe ingresar la clave de un administrador para autorizar.';
    return;
  }

  try {
    if (modalMode.value === 'INDIVIDUAL' && singleDocTarget.value) {
      await anulacionesStore.anularIndividual(
        singleDocTarget.value.tipo_documento,
        singleDocTarget.value.id,
        motivoAnulacion.value.trim(),
        adminPassword.value || undefined,
      );
      successMessage.value = `Documento ${singleDocTarget.value.correlativo} anulado correctamente.`;
    } else {
      const docsToCancel = selectedIds.value.map((id) => ({
        tipo_documento: filters.tipo_documento,
        documento_id: id,
      }));

      const res = await anulacionesStore.anularLote({
        documentos: docsToCancel,
        motivo: motivoAnulacion.value.trim(),
        admin_password: adminPassword.value || undefined,
      });
      successMessage.value = res.mensaje || `Se anularon ${selectedCount.value} documento(s).`;
    }

    closeModal();
    selectedIds.value = [];
    await anulacionesStore.fetchDocumentos(filters);
  } catch (err: any) {
    modalError.value = err.message || 'Error al procesar la anulación.';
  }
}

function formatFecha(fechaStr: string | Date): string {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  return d.toLocaleDateString('es-VE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

onMounted(async () => {
  if (sucursalStore.sucursalList.length === 0) {
    sucursalStore.fetchSucursales();
  }
  await handleSearch();
});
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6">
    <!-- Header -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Anulación de Documentos</h1>
        <p class="text-sm text-gray-500">
          Módulo centralizado para consulta, anulación individual y por lote de documentos administrativos.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="esSuperAdmin"
          class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
        >
          Super Administrador (Bypass de clave)
        </span>
        <span
          v-else
          class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
        >
          Requiere Clave de Administrador
        </span>
      </div>
    </div>

    <!-- Feedback Banner -->
    <div
      v-if="successMessage"
      class="mb-4 flex items-center justify-between rounded-lg bg-green-50 p-4 text-sm text-green-800 border border-green-200"
    >
      <span>{{ successMessage }}</span>
      <button class="text-green-600 hover:text-green-800 font-bold" @click="successMessage = null">✕</button>
    </div>

    <!-- Barra de Filtros -->
    <div class="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <form class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6" @submit.prevent="handleSearch">
        <!-- Tipo de Documento -->
        <div class="lg:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600">Tipo de Documento</label>
          <select
            v-model="filters.tipo_documento"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            @change="handleSearch"
          >
            <option v-for="tDoc in TIPOS_DOCUMENTOS" :key="tDoc.value" :value="tDoc.value">
              {{ tDoc.label }}
            </option>
          </select>
        </div>

        <!-- Sucursal -->
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Sucursal</label>
          <select
            v-model="filters.sucursal_id"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          >
            <option :value="undefined">Todas las sucursales</option>
            <option v-for="suc in sucursalStore.sucursalList" :key="suc.id" :value="Number(suc.id)">
              {{ suc.nombre }}
            </option>
          </select>
        </div>

        <!-- Fecha Desde -->
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Fecha Desde</label>
          <input
            v-model="filters.fecha_desde"
            type="date"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <!-- Fecha Hasta -->
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Fecha Hasta</label>
          <input
            v-model="filters.fecha_hasta"
            type="date"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <!-- Buscador -->
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Búsqueda Rápida</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Correlativo, Cliente..."
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <!-- Opciones y Botón Buscar -->
        <div class="flex items-center justify-between lg:col-span-6 pt-2 border-t border-gray-100">
          <label class="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
            <input
              v-model="filters.solo_activos"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
            />
            Mostrar solo documentos activos (no anulados)
          </label>

          <button
            type="submit"
            :disabled="anulacionesStore.isLoading"
            class="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-light disabled:opacity-50"
          >
            <SpinnerIcon v-if="anulacionesStore.isLoading" class="h-4 w-4 animate-spin" />
            <span>Consultar Documentos</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Barra de Acción por Lote (cuando hay elementos seleccionados) -->
    <div
      v-if="selectedCount > 0"
      class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm shadow-sm"
    >
      <div class="flex items-center gap-2">
        <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
          {{ selectedCount }}
        </span>
        <span class="font-medium text-red-900">
          documento(s) seleccionado(s) para anulación por lote
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg bg-white border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          @click="selectedIds = []"
        >
          Limpiar selección
        </button>
        <button
          type="button"
          class="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
          @click="openBatchModal"
        >
          Anular Selección por Lote ({{ selectedCount }})
        </button>
      </div>
    </div>

    <!-- Tabla de Resultados -->
    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div v-if="anulacionesStore.isLoading" class="p-12 text-center text-sm text-gray-500">
        <SpinnerIcon class="mx-auto mb-2 h-6 w-6 animate-spin text-brand" />
        <span>Cargando documentos...</span>
      </div>

      <div
        v-else-if="anulacionesStore.documentos.length === 0"
        class="p-12 text-center text-sm text-gray-500"
      >
        No se encontraron documentos con los filtros seleccionados.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-gray-700">
          <thead class="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
            <tr>
              <th class="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="px-4 py-3 font-semibold">Correlativo</th>
              <th class="px-4 py-3 font-semibold">Fecha</th>
              <th class="px-4 py-3 font-semibold">Cliente / Proveedor / Detalle</th>
              <th class="px-4 py-3 font-semibold text-right">Monto Total</th>
              <th class="px-4 py-3 font-semibold text-center">Estado</th>
              <th class="px-4 py-3 font-semibold">Observaciones / Motivo</th>
              <th class="px-4 py-3 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="doc in anulacionesStore.documentos"
              :key="doc.id"
              :class="[
                'hover:bg-gray-50/80 transition',
                selectedIds.includes(doc.id) ? 'bg-red-50/40' : '',
                !doc.es_anulable ? 'opacity-60 bg-gray-50/30' : '',
              ]"
            >
              <!-- Checkbox -->
              <td class="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(doc.id)"
                  :disabled="!doc.es_anulable"
                  class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer disabled:cursor-not-allowed"
                  @change="toggleSelectRow(doc.id)"
                />
              </td>

              <!-- Correlativo -->
              <td class="px-4 py-3 font-semibold text-gray-900 font-mono text-xs">
                {{ doc.correlativo }}
              </td>

              <!-- Fecha -->
              <td class="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                {{ formatFecha(doc.fecha) }}
              </td>

              <!-- Tercero -->
              <td class="px-4 py-3 text-xs font-medium text-gray-800">
                {{ doc.tercero_nombre }}
              </td>

              <!-- Monto -->
              <td class="px-4 py-3 text-right font-semibold text-gray-900">
                <span v-if="doc.monto_total > 0">
                  {{ formatMoney(doc.monto_total, 'VES') }}
                </span>
                <span v-else class="text-gray-400">—</span>
              </td>

              <!-- Estado -->
              <td class="px-4 py-3 text-center">
                <span
                  :class="[
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    doc.estado === 'ANULADA'
                      ? 'bg-red-100 text-red-800'
                      : doc.estado === 'PAGADA' || doc.estado === 'PROCESADA' || doc.estado === 'APLICADO'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800',
                  ]"
                >
                  {{ doc.estado }}
                </span>
              </td>

              <!-- Observaciones -->
              <td class="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" :title="doc.observaciones || ''">
                {{ doc.observaciones || '—' }}
              </td>

              <!-- Botón Acción -->
              <td class="px-4 py-3 text-center whitespace-nowrap">
                <button
                  v-if="doc.es_anulable"
                  type="button"
                  class="rounded bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                  @click="openSingleModal(doc)"
                >
                  Anular
                </button>
                <span v-else class="text-xs text-gray-400 italic">
                  Anulado
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de Confirmación de Anulación (Individual o Lote) -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
        <!-- Modal Title -->
        <div class="mb-4 flex items-center gap-3 text-red-600">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            ⚠️
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-900">
              {{ modalMode === 'INDIVIDUAL' ? 'Confirmar Anulación de Documento' : 'Confirmar Anulación por Lote' }}
            </h3>
            <p class="text-xs text-gray-500">
              Esta acción modificará el estado contable y/o inventario según corresponda.
            </p>
          </div>
        </div>

        <!-- Info / Resumen -->
        <div class="mb-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-700 border border-gray-200">
          <div v-if="modalMode === 'INDIVIDUAL' && singleDocTarget">
            <p><strong>Documento:</strong> {{ singleDocTarget.correlativo }}</p>
            <p><strong>Tipo:</strong> {{ singleDocTarget.tipo_documento }}</p>
            <p><strong>Beneficiario:</strong> {{ singleDocTarget.tercero_nombre }}</p>
          </div>
          <div v-else>
            <p class="font-bold text-red-700">
              Se anularán {{ selectedCount }} documento(s) en lote.
            </p>
            <p class="text-gray-500 mt-1">Tipo de documento: {{ filters.tipo_documento }}</p>
          </div>
        </div>

        <!-- Error en modal -->
        <div v-if="modalError" class="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          {{ modalError }}
        </div>

        <!-- Formulario -->
        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-700">
              Motivo de la Anulación <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="motivoAnulacion"
              rows="3"
              placeholder="Especifique el motivo por el cual se procede a anular..."
              class="w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
            ></textarea>
          </div>

          <!-- Campo Clave Admin (si no es super admin) -->
          <div v-if="!esSuperAdmin">
            <label class="mb-1 block text-xs font-semibold text-gray-700">
              Clave de Administrador <span class="text-red-500">*</span>
            </label>
            <input
              v-model="adminPassword"
              type="password"
              placeholder="Ingrese la contraseña de un usuario Administrador"
              class="w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
            />
            <p class="mt-1 text-[11px] text-gray-400">
              Requerido: Debe solicitar la clave a un usuario con rol de Administrador para autorizar esta operación.
            </p>
          </div>
        </div>

        <!-- Acciones del Modal -->
        <div class="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            :disabled="anulacionesStore.isAnulando"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            @click="closeModal"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="anulacionesStore.isAnulando"
            class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-50"
            @click="confirmAnulacion"
          >
            <SpinnerIcon v-if="anulacionesStore.isAnulando" class="h-4 w-4 animate-spin" />
            <span>Confirmar Anulación</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
