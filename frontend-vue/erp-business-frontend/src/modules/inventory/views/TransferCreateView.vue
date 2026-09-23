<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useCompanyInfo } from '@/composables/useCompanyInfo';
import PreliminarPickerDialog from '@/modules/preliminares/components/PreliminarPickerDialog.vue';
import { usePreliminaresStore } from '@/modules/preliminares/preliminares.store';
import type {
  PreliminarSummary,
  TransferPreliminarPayload,
} from '@/modules/preliminares/interfaces/preliminar.interface';
import { resolveApiErrorMessage } from '@/utils/api-error';
import TransferForm from '../components/TransferForm.vue';
import TransferPrintDocument from '../components/TransferPrintDocument.vue';
import type { StockTransfer, StockTransferFormData } from '../interfaces/transfer.interface';
import { useProductStore } from '../interfaces/product.store';
import { useTransferStore } from '../interfaces/transfer.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';

const { t } = useI18n();
const router = useRouter();
const transferStore = useTransferStore();
const preliminaresStore = usePreliminaresStore();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();
const { ensureLoaded: ensureCompanyLoaded, companyFor } = useCompanyInfo();

const emptyTransfer: StockTransferFormData = {
  category: 'BRANCH_TRANSFER',
  fromWarehouseId: null,
  toWarehouseId: null,
  items: [{ productId: '', quantity: 1 }],
  notes: '',
};

// Los datos de la empresa solo hacen falta para el encabezado del preliminar
// impreso; productos y almacenes los carga TransferForm al montarse.
onMounted(ensureCompanyLoaded);

const isSubmitting = ref(false);
const errorMessage = ref('');

// TransferForm copia initialData a su estado interno una sola vez, al montarse,
// así que cargar un preliminar exige remontarlo: de ahí el key.
const formData = ref<StockTransferFormData>(emptyTransfer);
const formKey = ref(0);

async function handleSubmit(data: StockTransferFormData): Promise<void> {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await transferStore.addTransfer(data);
    // El preliminar cumplió su función. Si el borrado falla, la transferencia
    // ya se emitió igual y el huérfano se borra a mano desde el diálogo.
    if (loadedPreliminarId.value !== null) {
      preliminaresStore.remove(loadedPreliminarId.value).catch(() => undefined);
      loadedPreliminarId.value = null;
    }
    router.push('/inventory/transfers');
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, t('inventory.transfers.actionError'));
  } finally {
    isSubmitting.value = false;
  }
}

// =========================================================================
// Documento preliminar
// =========================================================================

const loadedPreliminarId = ref<number | null>(null);
const isSavingPreliminar = ref(false);
const showPreliminarPicker = ref(false);
const preliminarNotices = ref<string[]>([]);
const preliminarPreview = ref<StockTransfer | null>(null);

// Membrete de la empresa dueña del almacén de origen (o del destino, si la
// categoría no tiene origen — ingreso de mercancía nueva).
const companyInfo = computed(() => {
  const warehouseId =
    preliminarPreview.value?.fromWarehouseId ??
    preliminarPreview.value?.toWarehouseId ??
    formData.value.fromWarehouseId ??
    formData.value.toWarehouseId;
  return companyFor(
    warehouseId ? warehouseStore.getWarehouseById(warehouseId)?.sucursalId ?? null : null,
  );
});

function warehouseName(warehouseId: string | null): string {
  if (!warehouseId) {
    return '—';
  }
  return warehouseStore.getWarehouseById(warehouseId)?.name ?? '—';
}

/** "Almacén Principal → Guayana", o solo el extremo que la categoría exige. */
function buildLabel(data: StockTransferFormData): string {
  const from = data.fromWarehouseId ? warehouseName(data.fromWarehouseId) : null;
  const to = data.toWarehouseId ? warehouseName(data.toWarehouseId) : null;
  if (from && to) return `${from} → ${to}`;
  return from ?? to ?? t(`inventory.transfers.category.${data.category}`);
}

async function savePreliminar(data: StockTransferFormData): Promise<void> {
  if (isSavingPreliminar.value) {
    return;
  }
  isSavingPreliminar.value = true;
  errorMessage.value = '';
  try {
    const payload: TransferPreliminarPayload = {
      categoria: data.category,
      almacenOrigenId: data.fromWarehouseId === null ? null : Number(data.fromWarehouseId),
      almacenDestinoId: data.toWarehouseId === null ? null : Number(data.toWarehouseId),
      motivo: data.notes ?? '',
      items: data.items
        .filter((item) => item.productId !== '')
        .map((item) => ({ productoId: Number(item.productId), cantidad: item.quantity })),
    };
    loadedPreliminarId.value = await preliminaresStore.save(
      'TRANSFERENCIA',
      buildLabel(data),
      payload,
      loadedPreliminarId.value,
    );
    preliminarNotices.value = [t('preliminares.saved')];
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, t('preliminares.saveError'));
  } finally {
    isSavingPreliminar.value = false;
  }
}

function openPreliminarPicker(): void {
  showPreliminarPicker.value = true;
}

async function loadPreliminar(summary: PreliminarSummary): Promise<void> {
  showPreliminarPicker.value = false;
  preliminarNotices.value = [];

  let payload: TransferPreliminarPayload;
  try {
    payload = await preliminaresStore.fetchOne<TransferPreliminarPayload>(summary.id);
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, t('preliminares.loadError'));
    return;
  }

  const notices: string[] = [];
  const items = payload.items.filter((item) => {
    const product = productStore.getProductById(String(item.productoId));
    if (!product) {
      notices.push(
        t('preliminares.adjusted.missingProduct', { name: `#${item.productoId}` }),
      );
      return false;
    }
    return true;
  });

  const resolveWarehouse = (id: number | null): string | null => {
    if (id === null) return null;
    const warehouse = warehouseStore.getWarehouseById(String(id));
    if (!warehouse) {
      notices.push(t('preliminares.adjusted.missingWarehouse'));
      return null;
    }
    return warehouse.id;
  };

  formData.value = {
    category: payload.categoria as StockTransferFormData['category'],
    fromWarehouseId: resolveWarehouse(payload.almacenOrigenId),
    toWarehouseId: resolveWarehouse(payload.almacenDestinoId),
    notes: payload.motivo,
    items:
      items.length > 0
        ? items.map((item) => ({
            productId: String(item.productoId),
            quantity: item.cantidad,
          }))
        : [{ productId: '', quantity: 1 }],
  };
  formKey.value += 1;
  loadedPreliminarId.value = summary.id;
  preliminarNotices.value = notices;
}

/**
 * Documento imprimible armado con lo que hay en el formulario. `code` y
 * `status` van vacíos/REQUESTED porque TransferPrintDocument en modo
 * `preliminary` no los muestra: todavía no existe la transferencia.
 */
function printPreliminar(data: StockTransferFormData): void {
  preliminarPreview.value = {
    id: 'preliminar',
    code: '',
    category: data.category,
    fromWarehouseId: data.fromWarehouseId,
    toWarehouseId: data.toWarehouseId,
    status: 'REQUESTED',
    items: data.items
      .filter((item) => item.productId !== '')
      .map((item) => ({ productId: item.productId, quantity: item.quantity })),
    notes: data.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.transfers.newTransfer') }}</h1>

    <div
      v-if="preliminarNotices.length > 0"
      class="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
    >
      <ul class="list-disc space-y-0.5 pl-4">
        <li v-for="(notice, index) in preliminarNotices" :key="index">{{ notice }}</li>
      </ul>
    </div>

    <TransferForm
      :key="formKey"
      :initial-data="formData"
      :submit-label="t('common.save')"
      :is-submitting="isSubmitting"
      :error-message="errorMessage"
      show-preliminares
      :is-saving-preliminar="isSavingPreliminar"
      @submit="handleSubmit"
      @save-preliminar="savePreliminar"
      @load-preliminar="openPreliminarPicker"
      @print-preliminar="printPreliminar"
    />

    <PreliminarPickerDialog
      v-if="showPreliminarPicker"
      type="TRANSFERENCIA"
      @close="showPreliminarPicker = false"
      @select="loadPreliminar"
    />

    <TransferPrintDocument
      v-if="preliminarPreview"
      :transfer="preliminarPreview"
      :company="companyInfo"
      preliminary
      @close="preliminarPreview = null"
    />
  </div>
</template>
