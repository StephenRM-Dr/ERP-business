<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useProductStore } from '@/modules/inventory/interfaces/product.store';
import { useStockStore } from '@/modules/inventory/interfaces/stock.store';
import { useWarehouseStore } from '@/modules/inventory/interfaces/warehouse.store';
import { useCategoryStore } from '@/modules/inventory/interfaces/category.store';
import { formatMoney } from '@/utils/money';

interface Props {
  show: boolean;
  selectedWarehouseId: number | null;
  unrestrictedStock?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'add-product', product: any, quantity: number): void;
  (e: 'update:selected-warehouse-id', warehouseId: number | null): void;
}>();

const authStore = useAuthStore();
const productStore = useProductStore();
const stockStore = useStockStore();
const warehouseStore = useWarehouseStore();
const categoryStore = useCategoryStore();

const isSuperAdmin = computed(() => authStore.user?.rolId === 1);
const canManageProducts = computed(
  () => isSuperAdmin.value || authStore.hasPermission('inventory.products'),
);

const searchTerm = ref<string>('');
const selectedCategoryId = ref<number | 'ALL'>('ALL');
const onlyWithStock = ref<boolean>(false);
const selectedProduct = ref<any | null>(null);
const quantityToAdd = ref<number>(1);

function normalizeText(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      searchTerm.value = '';
      selectedProduct.value = null;
      quantityToAdd.value = 1;
      if (productStore.productList.length === 0) {
        productStore.fetchProducts();
      }
      if (stockStore.stockList.length === 0) {
        stockStore.fetchStock();
      }
      if (warehouseStore.warehouseList.length === 0) {
        warehouseStore.fetchWarehouses();
      }
      if (categoryStore.categoryList.length === 0) {
        categoryStore.fetchCategories();
      }
    }
  },
);

const availableWarehouses = computed(() => {
  const active = warehouseStore.sortedWarehouses.filter(
    (w) => w.isActive && w.permiteFacturar !== false,
  );
  return active.length > 0 ? active : warehouseStore.sortedWarehouses;
});

// Map products with stock resolved against selectedWarehouseId
const productsWithStock = computed(() => {
  return productStore.productList.map((prod) => {
    const stockEntries = stockStore.stockList.filter(
      (s) => String(s.productId) === String(prod.id),
    );
    const warehouseStock = props.selectedWarehouseId !== null
      ? stockEntries
          .filter((s) => String(s.warehouseId) === String(props.selectedWarehouseId))
          .reduce((sum, s) => sum + Number(s.quantity || 0), 0)
      : stockEntries.reduce((sum, s) => sum + Number(s.quantity || 0), 0);

    const totalStock = stockEntries.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const basePrice = (prod.precios && prod.precios[0]?.precio) ? Number(prod.precios[0].precio) : (prod.precioVenta || prod.precioCosto || 0);

    return {
      ...prod,
      warehouseStock,
      totalStock,
      price: basePrice,
    };
  });
});

const filteredProducts = computed(() => {
  const rawTerm = searchTerm.value.trim();
  const searchTokens = normalizeText(rawTerm).split(/\s+/).filter(Boolean);

  return productsWithStock.value
    .filter((p: any) => {
      // Category filter
      if (selectedCategoryId.value !== 'ALL' && Number(p.categoriaId) !== Number(selectedCategoryId.value)) {
        return false;
      }

      // Stock filter
      if (onlyWithStock.value && p.warehouseStock <= 0) {
        return false;
      }

      // Text search
      if (searchTokens.length === 0) {
        return true;
      }

      const pCode = normalizeText(p.codigo);
      const pName = normalizeText(p.nombre);
      const pRef = normalizeText(p.referencia);
      const pMarca = normalizeText(p.marca);
      const pModelo = normalizeText(p.modelo);
      const pDesc = normalizeText(p.descripcionDetallada);
      const combined = `${pCode} ${pName} ${pRef} ${pMarca} ${pModelo} ${pDesc}`;

      return searchTokens.every((token) => combined.includes(token));
    })
    .slice(0, 100);
});

function handleSelect(product: any): void {
  selectedProduct.value = product;
  quantityToAdd.value = 1;
}

function handleAdd(product?: any, qty?: number): void {
  const target = product || selectedProduct.value;
  const count = qty || quantityToAdd.value;
  if (!target) return;
  emit('add-product', target, count);
  selectedProduct.value = null;
  quantityToAdd.value = 1;
}

function onWarehouseChange(e: Event): void {
  const val = Number((e.target as HTMLSelectElement).value);
  emit('update:selected-warehouse-id', isNaN(val) ? null : val);
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Header with Navy Palette -->
      <div class="flex flex-wrap items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-gradient-to-r from-[#0f2942] to-navy text-white">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white/10 text-cyan-300 flex items-center justify-center text-xl shadow-inner border border-white/10">
            📦
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-white tracking-wide">Catálogo de Inventario y Existencias</h3>
              <span
                v-if="canManageProducts"
                class="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold"
              >
                Edición Habilitada
              </span>
            </div>
            <p class="text-xs text-slate-300">
              Consulta existencias en tiempo real y agrega productos directamente a la factura
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Warehouse Switcher in Modal -->
          <div class="flex items-center gap-1.5 bg-[#0b1c2b] px-3 py-1.5 rounded-xl border border-cyan-500/30 text-xs">
            <span class="text-slate-300 text-[11px] font-bold">🏪 Almacén:</span>
            <select
              :value="selectedWarehouseId"
              class="bg-transparent text-xs font-bold text-cyan-300 outline-none cursor-pointer"
              @change="onWarehouseChange"
            >
              <option
                v-for="w in availableWarehouses"
                :key="w.id"
                :value="Number(w.id)"
                class="bg-navy text-white"
              >
                {{ w.name }}
              </option>
            </select>
          </div>

          <!-- Botón Crear Producto -->
          <a
            v-if="canManageProducts"
            href="/inventory/products/create"
            target="_blank"
            class="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition shadow-xs"
            title="Crear nuevo producto en el maestro (abre en nueva pestaña)"
          >
            <span>+</span>
            <span>Nuevo Producto</span>
          </a>

          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
            @click="emit('close')"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[240px]">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="🔍 Buscar por código, nombre, marca, referencia..."
            class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 pl-9 text-xs font-medium shadow-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <svg
            class="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Category Dropdown -->
        <div class="flex items-center gap-2">
          <select
            v-model="selectedCategoryId"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand shadow-xs cursor-pointer"
          >
            <option value="ALL">Todas las Categorías</option>
            <option
              v-for="cat in categoryStore.sortedCategories"
              :key="cat.id"
              :value="Number(cat.id)"
            >
              {{ cat.nombre }}
            </option>
          </select>

          <!-- Toggle Only With Stock -->
          <label class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-300 shadow-xs select-none">
            <input
              v-model="onlyWithStock"
              type="checkbox"
              class="h-3.5 w-3.5 rounded text-brand focus:ring-brand"
            />
            <span>Solo con stock</span>
          </label>
        </div>

        <!-- Selected Product Quick Add Bar -->
        <div v-if="selectedProduct" class="flex items-center gap-2 bg-blue-50 border border-brand/30 rounded-xl px-3 py-1.5 animate-in fade-in">
          <span class="text-xs font-bold text-navy truncate max-w-[180px]">
            {{ selectedProduct.nombre }}
          </span>
          <label class="text-[11px] text-slate-600 font-bold ml-1">Cant:</label>
          <input
            v-model.number="quantityToAdd"
            type="number"
            min="1"
            :max="unrestrictedStock ? undefined : (selectedProduct.warehouseStock || 1)"
            class="w-14 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-xs font-bold text-center outline-none"
          />
          <button
            type="button"
            class="rounded-lg bg-navy hover:bg-navy-light px-3 py-1 text-xs font-bold text-white transition cursor-pointer shadow-xs"
            @click="handleAdd()"
          >
            + Facturar
          </button>
        </div>
      </div>

      <!-- Products Table -->
      <div class="flex-1 overflow-y-auto p-3 min-h-[360px]">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th class="px-3.5 py-2.5">Código</th>
              <th class="px-3.5 py-2.5">Descripción del Producto</th>
              <th class="px-3.5 py-2.5 text-right">Precio Ref. ($)</th>
              <th class="px-3.5 py-2.5 text-center">Stock Almacén</th>
              <th class="px-3.5 py-2.5 text-center">Stock Global</th>
              <th class="px-3.5 py-2.5 text-center">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr
              v-for="p in filteredProducts"
              :key="p.id"
              :class="[
                'transition duration-150',
                selectedProduct?.id === p.id ? 'bg-blue-50/80' : 'hover:bg-slate-50'
              ]"
              @dblclick="handleAdd(p, 1)"
            >
              <!-- Code -->
              <td class="px-3.5 py-2.5 font-mono text-xs font-bold text-slate-700">
                {{ p.codigo }}
              </td>

              <!-- Product Info -->
              <td class="px-3.5 py-2.5">
                <div class="flex items-center gap-2">
                  <p class="font-bold text-slate-800">{{ p.nombre }}</p>
                  <a
                    v-if="canManageProducts"
                    :href="'/inventory/products/' + p.id + '/edit'"
                    target="_blank"
                    class="text-[10px] text-brand hover:underline inline-flex items-center gap-0.5"
                    title="Editar producto (nueva pestaña)"
                  >
                    ✏️ Editar
                  </a>
                </div>
                <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span v-if="p.referencia">Ref: {{ p.referencia }}</span>
                  <span v-if="p.marca">Marca: {{ p.marca }}</span>
                  <span v-if="p.descripcionDetallada" class="truncate max-w-xs">{{ p.descripcionDetallada }}</span>
                </div>
              </td>

              <!-- Price -->
              <td class="px-3.5 py-2.5 text-right font-mono font-bold text-navy">
                ${{ formatMoney(p.price, 'USD') }}
              </td>

              <!-- Warehouse Stock -->
              <td class="px-3.5 py-2.5 text-center">
                <span
                  :class="[
                    'inline-block px-2 py-0.5 rounded-full text-xs font-bold',
                    p.warehouseStock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                  ]"
                >
                  {{ p.warehouseStock }}
                </span>
              </td>

              <!-- Total Stock -->
              <td class="px-3.5 py-2.5 text-center text-xs font-medium text-slate-500">
                {{ p.totalStock }}
              </td>

              <!-- Actions -->
              <td class="px-3.5 py-2.5 text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    :disabled="p.warehouseStock <= 0 && !unrestrictedStock"
                    :class="[
                      'rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer',
                      p.warehouseStock > 0 || unrestrictedStock
                        ? 'bg-navy hover:bg-navy-light text-white shadow-xs'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    ]"
                    @click="handleAdd(p, 1)"
                    title="Agregar 1 unidad directamente"
                  >
                    + Agregar
                  </button>
                  <button
                    type="button"
                    class="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                    @click="handleSelect(p)"
                    title="Seleccionar para cambiar cantidad"
                  >
                    {{ selectedProduct?.id === p.id ? '✓' : '⚙️' }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredProducts.length === 0">
              <td colspan="6" class="py-12 text-center text-slate-400 text-xs">
                No se encontraron productos con los filtros seleccionados
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <span>
          Mostrando <strong>{{ filteredProducts.length }}</strong> productos coincidentes (Doble clic en una fila para agregar 1 unidad)
        </span>
        <button
          type="button"
          class="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 transition cursor-pointer"
          @click="emit('close')"
        >
          Cerrar
        </button>
      </div>

    </div>
  </div>
</template>
