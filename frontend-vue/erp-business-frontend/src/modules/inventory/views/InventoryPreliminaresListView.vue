<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { resolveApiErrorMessage } from '@/utils/api-error';
import type { PreliminarItem } from '@/modules/preliminares/interfaces/preliminar.interface';
import type {
  InventarioPreliminarSummary,
  TipoPreliminarInventario,
} from '../interfaces/inventario-preliminar.interface';
import { useInventoryTransformStore } from '../interfaces/inventory-transform.store';
import { useProductStore } from '../interfaces/product.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';

const { t } = useI18n();
const authStore = useAuthStore();
const transformStore = useInventoryTransformStore();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();

const canApply = computed<boolean>(() => authStore.hasPermission('inventario.nacional'));

onMounted(() => {
  if (productStore.productList.length === 0) {
    productStore.fetchProducts();
  }
  if (warehouseStore.warehouseList.length === 0) {
    warehouseStore.fetchWarehouses();
  }
  transformStore.fetchPreliminares();
});

// --- Nuevo preliminar ---

const tipo = ref<TipoPreliminarInventario>('INV_CARGO');
const etiqueta = ref<string>('');
const depositoId = ref<string>('');
const items = ref<PreliminarItem[]>([{ productoId: 0, cantidad: 1 }]);
const isSaving = ref<boolean>(false);
const errorMessage = ref<string>('');

function addItem(): void {
  items.value.push({ productoId: 0, cantidad: 1 });
}

function removeItem(index: number): void {
  items.value.splice(index, 1);
}

const canSave = computed<boolean>(
  () =>
    etiqueta.value.trim() !== '' &&
    depositoId.value !== '' &&
    items.value.some((item) => item.productoId > 0 && item.cantidad > 0),
);

async function guardar(): Promise<void> {
  if (!canSave.value) return;
  errorMessage.value = '';
  isSaving.value = true;
  try {
    await transformStore.guardarPreliminar(tipo.value, etiqueta.value.trim(), {
      depositoId: depositoId.value,
      items: items.value.filter((item) => item.productoId > 0 && item.cantidad > 0),
    });
    etiqueta.value = '';
    depositoId.value = '';
    items.value = [{ productoId: 0, cantidad: 1 }];
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, t('inventory.inventoryPreliminares.saveError'));
  } finally {
    isSaving.value = false;
  }
}

// --- Bandeja ---

const preliminarToApply = ref<InventarioPreliminarSummary | null>(null);
const isApplying = ref<boolean>(false);

function warehouseName(id: string): string {
  return warehouseStore.getWarehouseById(id)?.name ?? `#${id}`;
}

function tipoLabel(item: InventarioPreliminarSummary): string {
  return t(`inventory.inventoryPreliminares.tipo.${item.tipo}`);
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' });
}

async function confirmApply(): Promise<void> {
  if (!preliminarToApply.value) return;
  isApplying.value = true;
  try {
    await transformStore.aplicarPreliminar(preliminarToApply.value.id);
    preliminarToApply.value = null;
  } catch {
    // El mensaje queda en transformStore.actionError, visible en el diálogo.
  } finally {
    isApplying.value = false;
  }
}

function cancelApply(): void {
  preliminarToApply.value = null;
  transformStore.actionError = null;
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.inventoryPreliminares.title') }}</h1>

    <div class="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 class="mb-4 text-sm font-semibold text-gray-700">
        {{ t('inventory.inventoryPreliminares.newPreliminar') }}
      </h2>

      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('inventory.inventoryPreliminares.form.tipo') }}
          </label>
          <select
            v-model="tipo"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          >
            <option value="INV_CARGO">{{ t('inventory.inventoryPreliminares.tipo.INV_CARGO') }}</option>
            <option value="INV_DESCARGO">{{ t('inventory.inventoryPreliminares.tipo.INV_DESCARGO') }}</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('inventory.inventoryPreliminares.form.warehouse') }}
          </label>
          <select
            v-model="depositoId"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          >
            <option value="" disabled>{{ t('inventory.transformations.form.selectWarehouse') }}</option>
            <option
              v-for="warehouse in warehouseStore.sortedWarehouses"
              :key="warehouse.id"
              :value="warehouse.id"
            >
              [{{ warehouse.codigo }}] {{ warehouse.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('inventory.inventoryPreliminares.form.etiqueta') }}
          </label>
          <input
            v-model="etiqueta"
            type="text"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>
      </div>

      <div class="mt-4">
        <label class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('inventory.inventoryPreliminares.form.items') }}
        </label>
        <div v-for="(item, index) in items" :key="index" class="mb-2 flex items-center gap-2">
          <select
            v-model.number="item.productoId"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          >
            <option :value="0" disabled>{{ t('inventory.transformations.form.selectProduct') }}</option>
            <option
              v-for="product in productStore.sortedProductsByCode"
              :key="product.id"
              :value="Number(product.id)"
            >
              [{{ product.codigo }}] {{ product.nombre }}
            </option>
          </select>
          <input
            v-model.number="item.cantidad"
            type="number"
            min="0.0001"
            step="0.0001"
            class="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
          <button
            type="button"
            :disabled="items.length === 1"
            class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="removeItem(index)"
          >
            {{ t('common.remove') }}
          </button>
        </div>
        <button
          type="button"
          class="text-xs font-medium text-brand hover:text-brand-hover"
          @click="addItem"
        >
          {{ t('inventory.transfers.form.addItem') }}
        </button>
      </div>

      <p v-if="errorMessage" class="mt-4 text-sm text-red-600">{{ errorMessage }}</p>

      <div class="mt-4 flex justify-end">
        <button
          type="button"
          :disabled="!canSave || isSaving"
          class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          @click="guardar"
        >
          {{ isSaving ? t('common.loading') : t('inventory.inventoryPreliminares.form.save') }}
        </button>
      </div>
    </div>

    <h2 class="mb-3 text-sm font-semibold text-gray-700">{{ t('inventory.inventoryPreliminares.pending') }}</h2>
    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.inventoryPreliminares.form.etiqueta') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.inventoryPreliminares.form.tipo') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('inventory.transfers.form.items') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.transformations.date') }}</th>
              <th v-if="canApply" class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in transformStore.preliminares"
              :key="item.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 text-gray-700">{{ item.etiqueta }}</td>
              <td class="px-5 py-3.5 text-gray-600">{{ tipoLabel(item) }}</td>
              <td class="px-5 py-3.5 text-right text-gray-600">{{ item.itemsCount }}</td>
              <td class="px-5 py-3.5 text-gray-500">{{ formatDate(item.createdAt) }}</td>
              <td v-if="canApply" class="px-5 py-3.5 text-right">
                <button
                  type="button"
                  class="rounded-md px-2 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50"
                  @click="preliminarToApply = item"
                >
                  {{ t('inventory.inventoryPreliminares.apply') }}
                </button>
              </td>
            </tr>

            <tr v-if="transformStore.preliminares.length === 0">
              <td :colspan="canApply ? 5 : 4" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('inventory.inventoryPreliminares.empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfirmDialog
      :open="preliminarToApply !== null"
      :title="t('inventory.inventoryPreliminares.applyDialog.title')"
      :message="t('inventory.inventoryPreliminares.applyDialog.message', { label: preliminarToApply?.etiqueta ?? '' })"
      :confirm-label="t('inventory.inventoryPreliminares.apply')"
      :confirm-disabled="isApplying"
      destructive
      @confirm="confirmApply"
      @cancel="cancelApply"
    >
      <p v-if="transformStore.actionError" class="mt-3 text-sm text-red-600">
        {{ transformStore.actionError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
