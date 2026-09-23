<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import ConfiguracionPreviewModal from '@/components/ui/ConfiguracionPreviewModal.vue';
import { usePagination } from '@/composables/usePagination';
import type { Rol } from '../interfaces/rol.interface';
import { useRolStore } from '../interfaces/rol.store';

const { t } = useI18n();
const rolStore = useRolStore();

const searchTerm = ref<string>('');
const rolToDelete = ref<Rol | null>(null);
const isDeleting = ref<boolean>(false);
const inspectedRol = ref<Rol | null>(null);

onMounted(() => {
  rolStore.fetchRoles();
});

const filteredRoles = computed<Rol[]>(() =>
  rolStore.sortedRoles.filter((rol) => {
    const term = searchTerm.value.trim().toLowerCase();
    return term === '' || rol.nombre.toLowerCase().includes(term);
  }),
);

const pagination = usePagination(filteredRoles, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (rolToDelete.value) {
    isDeleting.value = true;
    try {
      await rolStore.deleteRol(rolToDelete.value.id);
      rolToDelete.value = null;
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  rolToDelete.value = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ t('master.roles.title') }}</h1>
        <p class="text-xs text-gray-500 mt-1">
          Gestiona los perfiles de acceso y consulta qué configuraciones y permisos tiene asignado cada rol.
        </p>
      </div>
      <RouterLink
        to="/master/roles/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('master.roles.newRol') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="roles-search" v-model="searchTerm" />
    </div>

    <p v-if="rolStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('master.roles.loading') }}
    </p>
    <p v-else-if="rolStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(rolStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('master.roles.form.nombre') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.roles.form.descripcion') }}</th>
              <th class="px-5 py-3.5 font-medium">Configuraciones y Permisos</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rol in pagination.pageItems.value"
              :key="rol.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-semibold text-gray-800">
                <div class="flex items-center gap-2">
                  <span>{{ rol.nombre }}</span>
                  <span
                    v-if="rol.id === '1'"
                    class="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700"
                  >
                    ADMIN
                  </span>
                </div>
              </td>
              <td class="px-5 py-3.5 text-gray-600 max-w-xs truncate">{{ rol.descripcion }}</td>
              
              <!-- Configuraciones agregadas al rol -->
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                      rol.id === '1'
                        ? 'bg-purple-100 text-purple-800'
                        : (rol.modulosPermitidos?.length || 0) > 0
                        ? 'bg-brand/10 text-brand'
                        : 'bg-gray-100 text-gray-400',
                    ]"
                  >
                    {{ rol.id === '1' ? 'Acceso Total' : `${rol.modulosPermitidos?.length || 0} permisos` }}
                  </span>

                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition"
                    title="Ver configuraciones detalladas del rol"
                    @click="inspectedRol = rol"
                  >
                    <span>👁️</span> Ver detalle
                  </button>
                </div>
              </td>

              <td class="px-5 py-3.5">
                <StatusChip
                  :label="rol.activo ? t('common.active') : t('common.inactive')"
                  :tone="rol.activo ? 'success' : 'neutral'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/master/roles/${rol.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="rolToDelete = rol"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="5" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('master.roles.empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        :page="pagination.page.value"
        :total-pages="pagination.totalPages.value"
        :total-items="pagination.totalItems.value"
        :range-start="pagination.rangeStart.value"
        :range-end="pagination.rangeEnd.value"
        :page-size="pagination.pageSize.value"
        @update:page="pagination.page.value = $event"
        @update:pageSize="pagination.pageSize.value = $event"
      />
    </div>

    <!-- Modal para ver qué configuraciones tiene agregadas el rol -->
    <ConfiguracionPreviewModal
      :show="inspectedRol !== null"
      :title="'Configuración del Rol: ' + (inspectedRol?.nombre || '')"
      :subtitle="inspectedRol?.descripcion || 'Sin descripción asignada'"
      :permisos="inspectedRol?.modulosPermitidos || []"
      :is-super-admin="inspectedRol?.id === '1'"
      @close="inspectedRol = null"
    />

    <ConfirmDialog
      :open="rolToDelete !== null"
      :title="t('master.roles.deleteDialog.title')"
      :message="t('master.roles.deleteDialog.message', { name: rolToDelete?.nombre ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
