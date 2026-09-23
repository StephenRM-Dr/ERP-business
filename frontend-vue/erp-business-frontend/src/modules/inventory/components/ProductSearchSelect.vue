<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Product } from '../interfaces/product.interface';

interface Props {
  modelValue: string;
  products: Product[];
  placeholder?: string;
  disabled?: boolean;
  getStock?: (productId: string) => number | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Buscar por código o nombre de producto...',
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [id: string];
  select: [product: Product | null];
}>();

const searchTerm = ref<string>('');
const isOpen = ref<boolean>(false);
const containerRef = ref<HTMLDivElement | null>(null);

// Find selected product
const selectedProduct = computed<Product | undefined>(() =>
  props.products.find((p) => String(p.id) === String(props.modelValue)),
);

// Keep search term in sync with selected product if not currently searching
watch(
  () => props.modelValue,
  () => {
    if (selectedProduct.value) {
      searchTerm.value = `[${selectedProduct.value.codigo}] ${selectedProduct.value.nombre}`;
    } else if (!isOpen.value) {
      searchTerm.value = '';
    }
  },
  { immediate: true },
);

const filteredProducts = computed<Product[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();
  // If input matches the current selected product display string exactly, show all products or filtered
  if (selectedProduct.value && searchTerm.value === `[${selectedProduct.value.codigo}] ${selectedProduct.value.nombre}`) {
    return props.products.slice(0, 50);
  }
  if (!term) {
    return props.products.slice(0, 50);
  }
  return props.products
    .filter((p) => p.codigo.toLowerCase().includes(term) || p.nombre.toLowerCase().includes(term))
    .slice(0, 50);
});

function onInputFocus(): void {
  if (props.disabled) return;
  isOpen.value = true;
  if (selectedProduct.value) {
    // Clear display text so user can type to search new product easily
    searchTerm.value = '';
  }
}

function onInputChange(): void {
  if (!isOpen.value) {
    isOpen.value = true;
  }
  if (!searchTerm.value.trim()) {
    // Deselect if input cleared manually
    emit('update:modelValue', '');
    emit('select', null);
  }
}

function selectProduct(prod: Product): void {
  emit('update:modelValue', prod.id);
  emit('select', prod);
  searchTerm.value = `[${prod.codigo}] ${prod.nombre}`;
  isOpen.value = false;
}

function clearSelection(): void {
  emit('update:modelValue', '');
  emit('select', null);
  searchTerm.value = '';
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent): void {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false;
    if (selectedProduct.value) {
      searchTerm.value = `[${selectedProduct.value.codigo}] ${selectedProduct.value.nombre}`;
    } else {
      searchTerm.value = '';
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <div class="relative flex items-center">
      <!-- Icono de búsqueda -->
      <span class="pointer-events-none absolute left-3 text-gray-400">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </span>

      <!-- Input de búsqueda -->
      <input
        v-model="searchTerm"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-8 text-xs font-medium text-gray-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:bg-gray-100 disabled:opacity-60"
        @focus="onInputFocus"
        @input="onInputChange"
      />

      <!-- Botón para limpiar -->
      <button
        v-if="modelValue || searchTerm"
        type="button"
        class="absolute right-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
        title="Limpiar selección"
        @click="clearSelection"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Panel Desplegable de Resultados -->
    <div
      v-if="isOpen && !disabled"
      class="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      <div v-if="filteredProducts.length === 0" class="px-3 py-3 text-center text-xs text-gray-500">
        No se encontraron productos coincidentes
      </div>

      <ul v-else class="divide-y divide-gray-100">
        <li
          v-for="prod in filteredProducts"
          :key="prod.id"
          class="cursor-pointer px-3 py-2 text-xs transition hover:bg-brand/10 flex items-center justify-between"
          :class="{ 'bg-brand/15 font-semibold text-brand': String(prod.id) === String(modelValue) }"
          @mousedown.prevent="selectProduct(prod)"
        >
          <div class="truncate pr-2">
            <span class="font-mono font-bold text-gray-900">[{{ prod.codigo }}]</span>
            <span class="ml-1.5 text-gray-800">{{ prod.nombre }}</span>
          </div>
          <div class="shrink-0 text-right font-mono text-[11px] text-gray-500 flex items-center gap-1.5">
            <span
              v-if="getStock !== undefined"
              class="rounded px-1.5 py-0.5 text-[10px] font-bold"
              :class="
                (getStock(prod.id) ?? 0) > 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              "
            >
              Stock: {{ getStock(prod.id) ?? 0 }}
            </span>
            <span>${{ (prod.precioCosto || 0).toFixed(2) }}</span>
            <span class="rounded bg-gray-100 px-1 py-0.2 text-[10px] text-gray-600">{{ prod.unidadMedida || 'pza' }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
