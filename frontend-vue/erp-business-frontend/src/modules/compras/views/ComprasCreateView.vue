<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/modules/auth/auth.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useExchangeRatesStore } from '@/modules/currencies/exchange-rates.store';
import type { Currency } from '@/modules/currencies/interfaces/currency.interface';
import { useProductStore } from '@/modules/inventory/interfaces/product.store';
import { useWarehouseStore } from '@/modules/inventory/interfaces/warehouse.store';
import { useProveedorStore } from '@/modules/master/proveedores/interfaces/proveedor.store';
import { useIgtfStore } from '@/modules/invoices/igtf.store';
import { resolveApiErrorMessage } from '@/utils/api-error';
import { isForeignCurrency } from '@/utils/money';
import type { CompraDetalle, CreateCompraPayload } from '../interfaces/compra.interface';
import { useComprasStore } from '../compras.store';

// `netoLinea`/`montoIvaLinea` are derived (see lineNeto/lineIva), not stored
// here — storing them meant recomputing on @change (blur), so a total kept
// showing stale numbers while the user was still typing into the line.
type CartLine = Omit<CompraDetalle, 'netoLinea' | 'montoIvaLinea'> & { key: string };

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const comprasStore = useComprasStore();
const proveedorStore = useProveedorStore();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();
const currenciesStore = useCurrenciesStore();
const exchangeRatesStore = useExchangeRatesStore();
const igtfStore = useIgtfStore();

onMounted(() => {
  if (proveedorStore.proveedorList.length === 0) proveedorStore.fetchProveedores();
  if (productStore.productList.length === 0) productStore.fetchProducts();
  if (warehouseStore.warehouseList.length === 0) warehouseStore.fetchWarehouses();
  if (currenciesStore.currencies.length === 0) currenciesStore.fetchCurrencies();
  if (exchangeRatesStore.rates.length === 0) exchangeRatesStore.fetchRates();
  if (!igtfStore.isLoaded) igtfStore.fetchIgtf();
});

// --- Supplier search ---
const proveedorSearchTerm = ref<string>('');
const selectedProveedorId = ref<string>('');
const selectedProveedor = computed(() => proveedorStore.getProveedorById(selectedProveedorId.value));
const filteredProveedores = computed(() => {
  const term = proveedorSearchTerm.value.trim().toLowerCase();
  if (term.length === 0) return [];
  return proveedorStore.sortedProveedores.filter(
    (proveedor) =>
      proveedor.nombre.toLowerCase().includes(term) || proveedor.rif.toLowerCase().includes(term),
  );
});
function selectProveedor(id: string): void {
  selectedProveedorId.value = id;
  proveedorSearchTerm.value = '';
}
function clearProveedorSelection(): void {
  selectedProveedorId.value = '';
}

// --- Header fields ---
const numeroFactura = ref<string>('');
const fechaVencimiento = ref<string>('');
const depositoId = ref<string>('');
const monedaCode = ref<Currency['code']>('');
const moneda = computed<Currency | undefined>(() => currenciesStore.findByCode(monedaCode.value));
const tasaCambio = ref<number>(1);
watch(monedaCode, (code) => {
  tasaCambio.value = code ? exchangeRatesStore.rateFor(code) || 1 : 1;
});

// --- Product search + cart ---
const productSearchTerm = ref<string>('');
const filteredProducts = computed(() => {
  const term = productSearchTerm.value.trim().toLowerCase();
  if (term.length === 0) return [];
  return productStore.sortedProducts.filter(
    (product) =>
      product.codigo.toLowerCase().includes(term) || product.nombre.toLowerCase().includes(term),
  );
});

const cart = ref<CartLine[]>([]);

type Taxable = Pick<CartLine, 'cantidad' | 'costoUnitario' | 'esExento' | 'impuestoPorcentaje'>;

function lineNeto(line: Taxable): number {
  return Number((line.cantidad * line.costoUnitario).toFixed(2));
}
function lineIva(line: Taxable): number {
  return line.esExento ? 0 : Number((lineNeto(line) * (line.impuestoPorcentaje / 100)).toFixed(2));
}

function addProduct(productId: string): void {
  if (cart.value.some((line) => String(line.productoId) === productId)) {
    productSearchTerm.value = '';
    return;
  }
  const product = productStore.getProductById(productId);
  if (!product) return;

  cart.value.push({
    key: productId,
    productoId: Number(productId),
    depositoId: depositoId.value ? Number(depositoId.value) : 0,
    loteId: null,
    cantidad: 1,
    costoUnitario: product.precioCosto ?? 0,
    esExento: false,
    impuestoPorcentaje: product.impuestoPorcentaje ?? 0,
  });
  productSearchTerm.value = '';
}

function removeLine(key: string): void {
  cart.value = cart.value.filter((line) => line.key !== key);
}

function productLabel(productoId: number): string {
  const product = productStore.getProductById(String(productoId));
  return product ? `${product.codigo} — ${product.nombre}` : `#${productoId}`;
}

// A single deposito applies to every line — a purchase invoice restocks one
// warehouse at a time in this screen, matching how transfers pick one origin.
watch(depositoId, (id) => {
  const numericId = id ? Number(id) : 0;
  for (const line of cart.value) line.depositoId = numericId;
});

// --- Totals ---
const totalBruto = computed<number>(() => cart.value.reduce((sum, line) => sum + lineNeto(line), 0));
const baseExenta = computed<number>(() =>
  cart.value.filter((line) => line.esExento).reduce((sum, line) => sum + lineNeto(line), 0),
);
const baseImponible = computed<number>(() =>
  cart.value.filter((line) => !line.esExento).reduce((sum, line) => sum + lineNeto(line), 0),
);
const montoIva = computed<number>(() => cart.value.reduce((sum, line) => sum + lineIva(line), 0));

// --- IGTF: solo aplica sobre compras en divisas (exento para VES, VES020 y cualquier tasa en Bolívares) ---
const aplicaIgtf = computed<boolean>(
  () => igtfStore.isEnabled && !!moneda.value && isForeignCurrency(moneda.value.code),
);
const igtfMonto = computed<number>(() =>
  aplicaIgtf.value ? Number(((totalBruto.value + montoIva.value) * (igtfStore.ratePercent / 100)).toFixed(2)) : 0,
);
const totalNeto = computed<number>(() => totalBruto.value + montoIva.value + igtfMonto.value);

const observaciones = ref<string>('');
const errorMessage = ref<string>('');
const isSubmitting = ref<boolean>(false);

const canSubmit = computed<boolean>(
  () =>
    selectedProveedorId.value !== '' &&
    numeroFactura.value.trim() !== '' &&
    fechaVencimiento.value !== '' &&
    depositoId.value !== '' &&
    moneda.value !== undefined &&
    cart.value.length > 0,
);

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value || !moneda.value) return;

  const payload: CreateCompraPayload = {
    sucursalId: authStore.user?.sucursalId ?? 0,
    numeroFactura: numeroFactura.value.trim(),
    proveedorId: Number(selectedProveedorId.value),
    fechaVencimiento: fechaVencimiento.value,
    monedaId: Number(moneda.value.id),
    tasaCambio: tasaCambio.value,
    totalBruto: totalBruto.value,
    baseExenta: baseExenta.value,
    baseImponible: baseImponible.value,
    montoIva: montoIva.value,
    igtfPorcentaje: aplicaIgtf.value ? igtfStore.ratePercent : 0,
    igtfMonto: igtfMonto.value,
    totalNeto: totalNeto.value,
    usuarioId: authStore.user?.id ?? 0,
    observaciones: observaciones.value,
    detalles: cart.value.map(({ key, ...detalle }) => ({
      ...detalle,
      netoLinea: lineNeto(detalle),
      montoIvaLinea: lineIva(detalle),
    })),
  };

  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await comprasStore.registerCompra(payload);
    router.push('/compras');
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, t('compras.form.saveError'));
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('compras.newCompra') }}</h1>

    <div class="space-y-6">
      <!-- Supplier search -->
      <div class="relative">
        <label for="cp-proveedor-search" class="sr-only">{{ t('compras.form.selectProveedor') }}</label>
        <div
          v-if="selectedProveedor"
          class="flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm"
        >
          <div>
            <p class="font-medium text-gray-800">{{ selectedProveedor.nombre }}</p>
            <p class="text-xs text-gray-500">{{ selectedProveedor.rif }}</p>
          </div>
          <button
            type="button"
            class="text-xs font-medium text-brand hover:text-brand-hover"
            @click="clearProveedorSelection"
          >
            {{ t('compras.form.changeProveedor') }}
          </button>
        </div>
        <template v-else>
          <input
            id="cp-proveedor-search"
            v-model="proveedorSearchTerm"
            type="text"
            :placeholder="t('compras.form.proveedorSearchPlaceholder')"
            class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <ul
            v-if="proveedorSearchTerm.trim().length > 0"
            class="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <li
              v-for="proveedor in filteredProveedores"
              :key="proveedor.id"
              class="cursor-pointer border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-brand/10"
              @click="selectProveedor(proveedor.id)"
            >
              <p class="text-sm font-medium text-gray-800">{{ proveedor.nombre }}</p>
              <p class="text-xs text-gray-500">{{ proveedor.rif }}</p>
            </li>
            <li v-if="filteredProveedores.length === 0" class="px-4 py-3 text-sm text-gray-500">
              {{ t('common.noResults') }}
            </li>
          </ul>
        </template>
      </div>

      <div class="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label for="cp-numero" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('compras.form.numeroFactura') }}
          </label>
          <input
            id="cp-numero"
            v-model="numeroFactura"
            type="text"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div>
          <label for="cp-vencimiento" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('compras.form.fechaVencimiento') }}
          </label>
          <input
            id="cp-vencimiento"
            v-model="fechaVencimiento"
            type="date"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div>
          <label for="cp-deposito" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('compras.form.deposito') }}
          </label>
          <select
            id="cp-deposito"
            v-model="depositoId"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          >
            <option value="" disabled>{{ t('compras.form.selectDeposito') }}</option>
            <option v-for="warehouse in warehouseStore.sortedWarehouses" :key="warehouse.id" :value="warehouse.id">
              [{{ warehouse.codigo }}] {{ warehouse.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="cp-moneda" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('compras.form.moneda') }}
          </label>
          <select
            id="cp-moneda"
            v-model="monedaCode"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          >
            <option value="" disabled>{{ t('compras.form.selectMoneda') }}</option>
            <option v-for="currency in currenciesStore.activeCurrencies" :key="currency.id" :value="currency.code">
              {{ currency.code }} — {{ currency.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="cp-tasa" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('compras.form.tasaCambio') }}
          </label>
          <input
            id="cp-tasa"
            v-model.number="tasaCambio"
            type="number"
            min="0"
            step="0.0001"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>
      </div>

      <!-- Product search -->
      <div class="relative">
        <label for="cp-product-search" class="sr-only">{{ t('compras.form.productSearchPlaceholder') }}</label>
        <input
          id="cp-product-search"
          v-model="productSearchTerm"
          type="text"
          :disabled="depositoId === ''"
          :placeholder="t('compras.form.productSearchPlaceholder')"
          class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:bg-gray-50"
        />
        <ul
          v-if="productSearchTerm.trim().length > 0"
          class="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <li
            v-for="product in filteredProducts"
            :key="product.id"
            class="cursor-pointer border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-brand/10"
            @click="addProduct(product.id)"
          >
            <p class="text-sm font-medium text-gray-800">{{ product.codigo }} — {{ product.nombre }}</p>
          </li>
          <li v-if="filteredProducts.length === 0" class="px-4 py-3 text-sm text-gray-500">
            {{ t('common.noResults') }}
          </li>
        </ul>
      </div>

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="px-5 py-3 font-medium">{{ t('compras.form.producto') }}</th>
                <th class="px-5 py-3 font-medium">{{ t('compras.form.cantidad') }}</th>
                <th class="px-5 py-3 font-medium">{{ t('compras.form.costoUnitario') }}</th>
                <th class="px-5 py-3 font-medium">{{ t('compras.form.impuestoPorcentaje') }}</th>
                <th class="px-5 py-3 font-medium">{{ t('compras.form.exento') }}</th>
                <th class="px-5 py-3 font-medium">{{ t('compras.form.netoLinea') }}</th>
                <th class="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in cart" :key="line.key" class="border-t border-gray-100">
                <td class="px-5 py-3 text-gray-800">{{ productLabel(line.productoId) }}</td>
                <td class="px-5 py-3">
                  <input
                    v-model.number="line.cantidad"
                    type="number"
                    min="0.01"
                    step="0.01"
                    :aria-label="t('compras.form.cantidad')"
                    class="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                  />
                </td>
                <td class="px-5 py-3">
                  <input
                    v-model.number="line.costoUnitario"
                    type="number"
                    min="0"
                    step="0.01"
                    :aria-label="t('compras.form.costoUnitario')"
                    class="w-28 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                  />
                </td>
                <td class="px-5 py-3">
                  <input
                    v-model.number="line.impuestoPorcentaje"
                    type="number"
                    min="0"
                    step="0.01"
                    :disabled="line.esExento"
                    :aria-label="t('compras.form.impuestoPorcentaje')"
                    class="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:bg-gray-50"
                  />
                </td>
                <td class="px-5 py-3">
                  <input
                    v-model="line.esExento"
                    type="checkbox"
                    :aria-label="t('compras.form.exento')"
                    class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
                  />
                </td>
                <td class="px-5 py-3 font-medium text-gray-800">{{ lineNeto(line).toFixed(2) }}</td>
                <td class="px-5 py-3 text-right">
                  <button
                    type="button"
                    class="text-xs font-medium text-red-500 hover:text-red-600"
                    @click="removeLine(line.key)"
                  >
                    {{ t('common.delete') }}
                  </button>
                </td>
              </tr>
              <tr v-if="cart.length === 0">
                <td colspan="7" class="px-5 py-10 text-center text-sm text-gray-400">
                  {{ t('compras.form.emptyCart') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <dl class="space-y-1 text-sm">
          <div class="flex justify-between">
            <dt class="text-gray-600">{{ t('compras.form.totalBruto') }}</dt>
            <dd class="text-gray-800">{{ totalBruto.toFixed(2) }} {{ monedaCode }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-600">{{ t('compras.form.montoIva') }}</dt>
            <dd class="text-gray-800">{{ montoIva.toFixed(2) }} {{ monedaCode }}</dd>
          </div>
          <div v-if="aplicaIgtf" class="flex justify-between text-xs text-gray-500">
            <dt>{{ t('compras.form.igtf', { rate: igtfStore.ratePercent }) }}</dt>
            <dd>{{ igtfMonto.toFixed(2) }} {{ monedaCode }}</dd>
          </div>
          <div class="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-800">
            <dt>{{ t('compras.form.totalNeto') }}</dt>
            <dd>{{ totalNeto.toFixed(2) }} {{ monedaCode }}</dd>
          </div>
        </dl>

        <div class="mt-4">
          <label for="cp-observaciones" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('compras.form.observaciones') }}
          </label>
          <textarea
            id="cp-observaciones"
            v-model="observaciones"
            rows="2"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <p v-if="errorMessage" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ errorMessage }}
        </p>

        <div class="mt-6 flex justify-end gap-3">
          <RouterLink
            to="/compras"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            {{ t('common.cancel') }}
          </RouterLink>
          <button
            type="button"
            :disabled="!canSubmit || isSubmitting"
            class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleSubmit"
          >
            {{ isSubmitting ? t('compras.form.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
