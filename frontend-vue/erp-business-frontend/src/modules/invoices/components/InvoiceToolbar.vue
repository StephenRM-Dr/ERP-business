<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';

const emit = defineEmits<{
  (e: 'inventario'): void;
  (e: 'reimpresion'): void;
  (e: 'clientes'): void;
}>();

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.user?.rolId === 1);

// Permiso para consultar inventario (inventory.summary o inventory.products)
const canInventario = computed(
  () =>
    isSuperAdmin.value ||
    authStore.hasPermission('inventory.summary') ||
    authStore.hasPermission('inventory.products') ||
    authStore.hasPermission('invoices'),
);

// Permiso para reimpresión
const canReimpresion = computed(
  () =>
    isSuperAdmin.value ||
    authStore.hasPermission('invoices.view') ||
    authStore.hasPermission('invoices'),
);

// Permiso para clientes
const canClientes = computed(
  () =>
    isSuperAdmin.value ||
    authStore.hasPermission('customers.view') ||
    authStore.hasPermission('customers'),
);
</script>

<template>
  <div class="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/80 bg-white/90 p-1 shadow-xs backdrop-blur-xs">
    <!-- 1. Inventario -->
    <button
      type="button"
      :disabled="!canInventario"
      :title="canInventario ? 'Consultar catálogo y existencias de inventario' : 'Sin permiso para consultar inventario'"
      :class="[
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150',
        canInventario
          ? 'bg-indigo-50/80 text-indigo-800 hover:bg-indigo-100 hover:shadow-xs active:scale-95 cursor-pointer'
          : 'bg-gray-100/70 text-gray-400 opacity-50 cursor-not-allowed'
      ]"
      @click="canInventario && emit('inventario')"
    >
      <span class="text-sm">📦</span>
      <span>Inventario</span>
    </button>

    <!-- 2. Reimpresión -->
    <button
      type="button"
      :disabled="!canReimpresion"
      :title="canReimpresion ? 'Reimprimir facturas emitidas' : 'Sin permiso para reimprimir facturas'"
      :class="[
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150',
        canReimpresion
          ? 'bg-sky-50/80 text-sky-800 hover:bg-sky-100 hover:shadow-xs active:scale-95 cursor-pointer'
          : 'bg-gray-100/70 text-gray-400 opacity-50 cursor-not-allowed'
      ]"
      @click="canReimpresion && emit('reimpresion')"
    >
      <span class="text-sm">🖨️</span>
      <span>Reimpresión</span>
    </button>

    <!-- 3. Clientes -->
    <button
      type="button"
      :disabled="!canClientes"
      :title="canClientes ? 'Directorio y consulta de clientes' : 'Sin permiso para ver clientes'"
      :class="[
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150',
        canClientes
          ? 'bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 hover:shadow-xs active:scale-95 cursor-pointer'
          : 'bg-gray-100/70 text-gray-400 opacity-50 cursor-not-allowed'
      ]"
      @click="canClientes && emit('clientes')"
    >
      <span class="text-sm">👥</span>
      <span>Clientes</span>
    </button>
  </div>
</template>
