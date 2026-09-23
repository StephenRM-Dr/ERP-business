<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import ConfiguracionPreviewModal from '@/components/ui/ConfiguracionPreviewModal.vue';
import { usePagination } from '@/composables/usePagination';
import { useRolStore } from '@/modules/master/roles/interfaces/rol.store';
import { useSucursalStore } from '@/modules/master/sucursales/interfaces/sucursal.store';
import type { Usuario } from '../interfaces/usuario.interface';
import { useUsuarioStore } from '../interfaces/usuario.store';

const { t } = useI18n();
const usuarioStore = useUsuarioStore();
const rolStore = useRolStore();
const sucursalStore = useSucursalStore();

const searchTerm = ref<string>('');
const usuarioToDelete = ref<Usuario | null>(null);
const isDeleting = ref<boolean>(false);
const inspectedUsuario = ref<Usuario | null>(null);

onMounted(() => {
  usuarioStore.fetchUsuarios();
  if (rolStore.rolList.length === 0) {
    rolStore.fetchRoles();
  }
  if (sucursalStore.sucursalList.length === 0) {
    sucursalStore.fetchSucursales();
  }
});

function rolName(usuario: Usuario | null): string {
  if (!usuario || usuario.rolId === null) {
    return '—';
  }
  return usuario.rolNombre || rolStore.getRolById(String(usuario.rolId))?.nombre || '—';
}

function sucursalLabel(usuario: Usuario): string {
  if (usuario.rolId === 1) {
    return 'Todas (Super Admin)';
  }
  if (usuario.sucursalNombre) {
    return usuario.sucursalNombre;
  }
  if (usuario.sucursalId !== null) {
    return sucursalStore.getSucursalById(String(usuario.sucursalId))?.nombre || '—';
  }
  return 'Global / Sin sucursal fija';
}

function userPermissions(usuario: Usuario | null): string[] {
  if (!usuario) return [];
  if (usuario.permisos && usuario.permisos.length > 0) {
    return usuario.permisos;
  }
  if (usuario.rolId !== null) {
    return rolStore.getRolById(String(usuario.rolId))?.modulosPermitidos || [];
  }
  return [];
}

const filteredUsuarios = computed<Usuario[]>(() =>
  usuarioStore.sortedUsuarios.filter((usuario) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      usuario.username.toLowerCase().includes(term) ||
      usuario.nombreCompleto.toLowerCase().includes(term) ||
      rolName(usuario).toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredUsuarios, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (usuarioToDelete.value) {
    isDeleting.value = true;
    try {
      await usuarioStore.deleteUsuario(usuarioToDelete.value.id);
      usuarioToDelete.value = null;
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  usuarioToDelete.value = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ t('master.usuarios.title') }}</h1>
        <p class="text-xs text-gray-500 mt-1">
          Gestiona los usuarios del sistema y verifica qué configuraciones, sucursal y permisos tienen habilitados.
        </p>
      </div>
      <RouterLink
        to="/master/usuarios/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('master.usuarios.newUsuario') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="usuarios-search" v-model="searchTerm" />
    </div>

    <p v-if="usuarioStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('master.usuarios.loading') }}
    </p>
    <p v-else-if="usuarioStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(usuarioStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('master.usuarios.form.username') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.usuarios.form.nombreCompleto') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.usuarios.form.rolId') }}</th>
              <th class="px-5 py-3.5 font-medium">Sucursal y Configuraciones</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="usuario in pagination.pageItems.value"
              :key="usuario.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono font-semibold text-gray-800">
                <div class="flex items-center gap-1.5">
                  <span>{{ usuario.username }}</span>
                  <span
                    v-if="usuario.rolId === 1"
                    class="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700"
                  >
                    ADMIN
                  </span>
                </div>
              </td>
              <td class="px-5 py-3.5 font-medium text-gray-800">{{ usuario.nombreCompleto }}</td>
              <td class="px-5 py-3.5 text-gray-600">
                <span class="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                  {{ rolName(usuario) }}
                </span>
              </td>

              <!-- Sucursal y configuraciones agregadas al usuario -->
              <td class="px-5 py-3.5">
                <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <span class="text-xs font-medium text-gray-600 truncate max-w-[140px]" :title="sucursalLabel(usuario)">
                    📍 {{ sucursalLabel(usuario) }}
                  </span>

                  <div class="flex items-center gap-1.5">
                    <span
                      :class="[
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        usuario.rolId === 1
                          ? 'bg-purple-100 text-purple-800'
                          : userPermissions(usuario).length > 0
                          ? 'bg-brand/10 text-brand'
                          : 'bg-gray-100 text-gray-400',
                      ]"
                    >
                      {{ usuario.rolId === 1 ? 'Total' : `${userPermissions(usuario).length} permisos` }}
                    </span>

                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition"
                      title="Ver configuraciones detalladas del usuario"
                      @click="inspectedUsuario = usuario"
                    >
                      <span>👁️</span> Ver detalle
                    </button>
                  </div>
                </div>
              </td>

              <td class="px-5 py-3.5">
                <StatusChip
                  :label="usuario.activo ? t('common.active') : t('common.inactive')"
                  :tone="usuario.activo ? 'success' : 'neutral'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/master/usuarios/${usuario.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="usuarioToDelete = usuario"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="6" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('master.usuarios.empty') }}
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

    <!-- Modal para ver qué configuraciones tiene agregadas el usuario -->
    <ConfiguracionPreviewModal
      :show="inspectedUsuario !== null"
      :title="'Configuración del Usuario: ' + (inspectedUsuario?.username || '')"
      :subtitle="(inspectedUsuario?.nombreCompleto || '') + ' • Rol: ' + rolName(inspectedUsuario) + ' • Sucursal: ' + (inspectedUsuario ? sucursalLabel(inspectedUsuario) : '')"
      :permisos="userPermissions(inspectedUsuario)"
      :is-super-admin="inspectedUsuario?.rolId === 1"
      @close="inspectedUsuario = null"
    />

    <ConfirmDialog
      :open="usuarioToDelete !== null"
      :title="t('master.usuarios.deleteDialog.title')"
      :message="t('master.usuarios.deleteDialog.message', { name: usuarioToDelete?.username ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
