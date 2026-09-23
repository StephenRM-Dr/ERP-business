<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAuthStore } from '@/modules/auth/auth.store';
import { resolveApiErrorMessage } from '@/utils/api-error';
import type {
  CreateReglaTransformacionData,
  SplitItem,
  TipoTransformacion,
} from '../interfaces/transformacion.interface';
import { useInventoryTransformStore } from '../interfaces/inventory-transform.store';
import { useProductStore } from '../interfaces/product.store';

const { t } = useI18n();
const authStore = useAuthStore();
const transformStore = useInventoryTransformStore();
const productStore = useProductStore();

const canManage = computed<boolean>(() => authStore.hasPermission('inventario.admin'));

const productoId = ref<string>('');
const tipoTransformacion = ref<TipoTransformacion>('POR_METRO');
const factor = ref<number>(1);
const splitItems = ref<SplitItem[]>([{ productoId: '', cantidad: 1 }]);
const isSaving = ref<boolean>(false);
const errorMessage = ref<string>('');
const successMessage = ref<string>('');
const searchTerm = ref<string>('');

const ruleTypes: TipoTransformacion[] = [
  'POR_METRO',
  'ROLLO_A_METROS',
  'TAZAS',
  'HOJILLA_COMBO',
  'SPLIT_FIJO',
];

const examples: Array<{
  key: TipoTransformacion;
  titleKey: string;
  descriptionKey: string;
}> = [
  {
    key: 'POR_METRO',
    titleKey: 'inventory.transformationRules.examples.POR_METRO.title',
    descriptionKey: 'inventory.transformationRules.examples.POR_METRO.description',
  },
  {
    key: 'ROLLO_A_METROS',
    titleKey: 'inventory.transformationRules.examples.ROLLO_A_METROS.title',
    descriptionKey: 'inventory.transformationRules.examples.ROLLO_A_METROS.description',
  },
  {
    key: 'TAZAS',
    titleKey: 'inventory.transformationRules.examples.TAZAS.title',
    descriptionKey: 'inventory.transformationRules.examples.TAZAS.description',
  },
  {
    key: 'HOJILLA_COMBO',
    titleKey: 'inventory.transformationRules.examples.HOJILLA_COMBO.title',
    descriptionKey: 'inventory.transformationRules.examples.HOJILLA_COMBO.description',
  },
  {
    key: 'SPLIT_FIJO',
    titleKey: 'inventory.transformationRules.examples.SPLIT_FIJO.title',
    descriptionKey: 'inventory.transformationRules.examples.SPLIT_FIJO.description',
  },
];

onMounted(async () => {
  if (productStore.productList.length === 0) {
    await productStore.fetchProducts();
  }
  await transformStore.fetchReglas();
});

const filteredReglas = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  return transformStore.reglas.filter((regla) => {
    const product = productStore.getProductById(regla.productoId);
    const productText = ((product?.codigo ?? '') + ' ' + (product?.nombre ?? '')).toLowerCase();
    return term === '' || regla.tipoTransformacion.toLowerCase().includes(term) || productText.includes(term);
  });
});

const isSplitFijo = computed<boolean>(() => tipoTransformacion.value === 'SPLIT_FIJO');

const canSave = computed<boolean>(() => {
  if (productoId.value === '') return false;
  if (isSplitFijo.value) {
    return splitItems.value.some((item) => item.productoId !== '' && item.cantidad > 0);
  }
  return factor.value > 0;
});

function productLabel(productId: string): string {
  const product = productStore.getProductById(productId);
  return product ? '[' + product.codigo + '] ' + product.nombre : '#' + productId;
}

function typeLabel(type: TipoTransformacion): string {
  return t('inventory.transformationRules.types.' + type);
}

function typeDescription(type: TipoTransformacion): string {
  return t('inventory.transformationRules.typeDescriptions.' + type);
}

function resetForm(): void {
  productoId.value = '';
  tipoTransformacion.value = 'POR_METRO';
  factor.value = 1;
  splitItems.value = [{ productoId: '', cantidad: 1 }];
  errorMessage.value = '';
}

function addSplitItem(): void {
  splitItems.value.push({ productoId: '', cantidad: 1 });
}

function removeSplitItem(index: number): void {
  splitItems.value.splice(index, 1);
}

function preloadExample(type: TipoTransformacion): void {
  successMessage.value = '';
  errorMessage.value = '';

  if (type === 'POR_METRO') {
    const product = productStore.productList.find((item) => item.codigo === '03009');
    productoId.value = product?.id ?? '';
    tipoTransformacion.value = type;
    factor.value = 1;
    splitItems.value = [{ productoId: '', cantidad: 1 }];
    return;
  }

  if (type === 'ROLLO_A_METROS') {
    const product = productStore.productList.find((item) => item.codigo === '01039');
    productoId.value = product?.id ?? '';
    tipoTransformacion.value = type;
    factor.value = 100;
    splitItems.value = [{ productoId: '', cantidad: 1 }];
    return;
  }

  if (type === 'TAZAS') {
    const product = productStore.productList.find((item) => item.codigo === '66003');
    productoId.value = product?.id ?? '';
    tipoTransformacion.value = type;
    factor.value = 36;
    splitItems.value = [{ productoId: '', cantidad: 1 }];
    return;
  }

  if (type === 'HOJILLA_COMBO') {
    const product = productStore.productList.find((item) => item.codigo === '51037');
    productoId.value = product?.id ?? '';
    tipoTransformacion.value = type;
    factor.value = 3;
    splitItems.value = [{ productoId: '', cantidad: 1 }];
    return;
  }

  const splitSource = productStore.productList.find((item) => item.codigo === '83003');
  const splitA = productStore.productList.find((item) => item.codigo === '83002');
  const splitB = productStore.productList.find((item) => item.codigo === '83001');
  productoId.value = splitSource?.id ?? '';
  tipoTransformacion.value = 'SPLIT_FIJO';
  factor.value = 1;
  splitItems.value = [
    { productoId: splitA?.id ?? '', cantidad: 1 },
    { productoId: splitB?.id ?? '', cantidad: 1 },
  ];
}

async function guardarRegla(): Promise<void> {
  if (!canSave.value || !canManage.value) return;

  isSaving.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  const payload: CreateReglaTransformacionData = {
    productoId: productoId.value,
    tipoTransformacion: tipoTransformacion.value,
    factor: isSplitFijo.value ? undefined : factor.value,
    splitItems: isSplitFijo.value
      ? splitItems.value.filter((item) => item.productoId !== '' && item.cantidad > 0)
      : null,
  };

  try {
    const created = await transformStore.addRegla(payload);
    successMessage.value = t('inventory.transformationRules.form.success', {
      product: productLabel(created.productoId),
    });
    resetForm();
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, t('inventory.transformationRules.form.saveError'));
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ t('inventory.transformationRules.title') }}</h1>
        <p class="mt-1 text-sm text-gray-500">{{ t('inventory.transformationRules.subtitle') }}</p>
      </div>
      <RouterLink to="/inventory/transformations" class="text-sm font-medium text-brand hover:text-brand-hover">
        {{ t('inventory.transformationRules.backToTransformations') }}
      </RouterLink>
    </div>

    <div class="mb-6 grid gap-4 lg:grid-cols-5">
      <article
        v-for="example in examples"
        :key="example.key"
        class="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm"
      >
        <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">
          {{ typeLabel(example.key) }}
        </p>
        <h2 class="mt-2 text-sm font-semibold text-gray-800">{{ t(example.titleKey) }}</h2>
        <p class="mt-2 text-xs leading-5 text-gray-600">{{ t(example.descriptionKey) }}</p>
        <button
          v-if="canManage"
          type="button"
          class="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-800"
          @click="preloadExample(example.key)"
        >
          {{ t('inventory.transformationRules.examples.useExample') }}
        </button>
      </article>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.1fr,1.6fr]">
      <section class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-4">
          <h2 class="text-sm font-semibold text-gray-700">{{ t('inventory.transformationRules.form.title') }}</h2>
          <span
            :class="[
              'rounded-full px-3 py-1 text-xs font-semibold',
              canManage ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500',
            ]"
          >
            {{ canManage ? t('inventory.transformationRules.form.adminEnabled') : t('inventory.transformationRules.form.readOnly') }}
          </span>
        </div>

        <div v-if="!canManage" class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          {{ t('inventory.transformationRules.form.readOnlyHelp') }}
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs font-medium text-gray-500">
              {{ t('inventory.transformationRules.form.product') }}
            </label>
            <select
              v-model="productoId"
              :disabled="!canManage"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="" disabled>{{ t('inventory.transformationRules.form.selectProduct') }}</option>
              <option v-for="product in productStore.sortedProductsByCode" :key="product.id" :value="product.id">
                [{{ product.codigo }}] {{ product.nombre }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500">
              {{ t('inventory.transformationRules.form.type') }}
            </label>
            <select
              v-model="tipoTransformacion"
              :disabled="!canManage"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option v-for="type in ruleTypes" :key="type" :value="type">{{ typeLabel(type) }}</option>
            </select>
            <p class="mt-1 text-xs text-gray-500">{{ typeDescription(tipoTransformacion) }}</p>
          </div>

          <div v-if="!isSplitFijo">
            <label class="mb-1 block text-xs font-medium text-gray-500">
              {{ t('inventory.transformationRules.form.factor') }}
            </label>
            <input
              v-model.number="factor"
              :disabled="!canManage"
              type="number"
              min="0.0001"
              step="0.0001"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>
        </div>

        <div v-if="isSplitFijo" class="mt-5">
          <div class="mb-2 flex items-center justify-between">
            <label class="block text-xs font-medium text-gray-500">
              {{ t('inventory.transformationRules.form.splitItems') }}
            </label>
            <button
              type="button"
              :disabled="!canManage"
              class="text-xs font-medium text-brand hover:text-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              @click="addSplitItem"
            >
              {{ t('inventory.transformationRules.form.addSplitItem') }}
            </button>
          </div>

          <div v-for="(item, index) in splitItems" :key="index" class="mb-2 flex items-center gap-2">
            <select
              v-model="item.productoId"
              :disabled="!canManage"
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="" disabled>{{ t('inventory.transformationRules.form.selectSplitProduct') }}</option>
              <option v-for="product in productStore.sortedProductsByCode" :key="product.id" :value="product.id">
                [{{ product.codigo }}] {{ product.nombre }}
              </option>
            </select>
            <input
              v-model.number="item.cantidad"
              :disabled="!canManage"
              type="number"
              min="0.0001"
              step="0.0001"
              class="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <button
              type="button"
              :disabled="!canManage || splitItems.length === 1"
              class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              @click="removeSplitItem(index)"
            >
              {{ t('common.remove') }}
            </button>
          </div>
        </div>

        <p v-if="errorMessage" class="mt-4 text-sm text-red-600">{{ errorMessage }}</p>
        <p v-if="successMessage" class="mt-4 text-sm text-emerald-600">{{ successMessage }}</p>

        <div class="mt-5 flex gap-3">
          <button
            type="button"
            :disabled="!canSave || !canManage || isSaving"
            class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            @click="guardarRegla"
          >
            {{ isSaving ? t('common.saving') : t('inventory.transformationRules.form.save') }}
          </button>
          <button
            type="button"
            :disabled="!canManage"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            @click="resetForm"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </section>

      <section class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-gray-700">{{ t('inventory.transformationRules.list.title') }}</h2>
            <p class="mt-1 text-xs text-gray-500">{{ t('inventory.transformationRules.list.help') }}</p>
          </div>
          <input
            v-model="searchTerm"
            type="text"
            :placeholder="t('inventory.transformationRules.list.searchPlaceholder')"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 sm:w-72"
          />
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="px-4 py-3 font-medium">{{ t('inventory.transformationRules.list.product') }}</th>
                <th class="px-4 py-3 font-medium">{{ t('inventory.transformationRules.list.type') }}</th>
                <th class="px-4 py-3 font-medium">{{ t('inventory.transformationRules.list.factor') }}</th>
                <th class="px-4 py-3 font-medium">{{ t('inventory.transformationRules.list.result') }}</th>
                <th class="px-4 py-3 font-medium">{{ t('common.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="regla in filteredReglas" :key="regla.id" class="border-t border-gray-100 align-top transition hover:bg-gray-50/60">
                <td class="px-4 py-3 text-gray-700">{{ productLabel(regla.productoId) }}</td>
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-700">{{ typeLabel(regla.tipoTransformacion) }}</p>
                  <p class="mt-1 text-xs text-gray-500">{{ typeDescription(regla.tipoTransformacion) }}</p>
                </td>
                <td class="px-4 py-3 text-gray-600">
                  {{ regla.tipoTransformacion === 'SPLIT_FIJO' ? t('inventory.transformationRules.list.notApplicable') : regla.factor }}
                </td>
                <td class="px-4 py-3 text-gray-600">
                  <span v-if="regla.splitItems?.length">
                    {{ regla.splitItems.map((item) => productLabel(item.productoId) + ' x ' + item.cantidad).join(' | ') }}
                  </span>
                  <span v-else>{{ t('inventory.transformationRules.list.sameProduct') }}</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      regla.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500',
                    ]"
                  >
                    {{ regla.activo ? t('common.active') : t('common.inactive') }}
                  </span>
                </td>
              </tr>
              <tr v-if="filteredReglas.length === 0">
                <td colspan="5" class="px-4 py-10 text-center text-sm text-gray-400">
                  {{ t('inventory.transformationRules.list.empty') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
