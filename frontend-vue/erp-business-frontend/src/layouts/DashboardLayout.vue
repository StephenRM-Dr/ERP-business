<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/modules/auth/auth.store';
import { SIDEBAR_TREE, filterSidebarTree } from './sidebar/sidebar-tree';
import SidebarTreeNode from './sidebar/SidebarTreeNode.vue';
import { useKeyboardShortcuts, formatShortcut } from '@/composables/useKeyboardShortcuts';
import type { KeyboardShortcut } from '@/composables/useKeyboardShortcuts';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const visibleSidebarTree = computed(() =>
  filterSidebarTree(SIDEBAR_TREE, (permission) => authStore.hasPermission(permission)),
);

// ── Sidebar state ───────────────────────────────────────────────────────────────
const isSidebarOpen = ref<boolean>(false);
const isSidebarCollapsed = ref<boolean>(false);

// Auto-colapsar menú al ingresar a la ruta de Punto de Venta (POS)
watch(
  () => route.name,
  (name) => {
    if (name === 'POS' || name === 'InvoiceCreate') {
      isSidebarCollapsed.value = true;
      isSidebarOpen.value = false;
    }
  },
  { immediate: true },
);

function toggleSidebar(): void {
  if (window.innerWidth < 1024) {
    isSidebarOpen.value = !isSidebarOpen.value;
  } else {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
  }
}

provide('closeSidebar', () => {
  isSidebarOpen.value = false;
});

// ── Full-bleed routes (sin padding en el <main>) ─────────────────────────────────
const isFullBleedRoute = computed(
  () => route.name === 'MasterReports' || route.name === 'POS' || route.name === 'InvoiceCreate',
);

// ── Panel de atajos de teclado ──────────────────────────────────────────────────
const showShortcutsPanel = ref<boolean>(false);

async function handleLogout(): Promise<void> {
  authStore.logout();
  await router.push({ name: 'Login' });
}

// ── Definición de atajos ────────────────────────────────────────────────────────
const shortcuts: KeyboardShortcut[] = [
  // Sesión
  {
    key: 'u', ctrl: true,
    description: 'Cerrar sesión / Cambiar usuario',
    group: 'Sesión',
    action: () => handleLogout(),
  },

  // Navegación
  {
    key: 'h', ctrl: true,
    description: 'Ir al Tablero (Home)',
    group: 'Navegación',
    action: () => router.push('/dashboard'),
  },
  {
    key: 'p', ctrl: true,
    description: 'Abrir Punto de Venta (POS)',
    group: 'Navegación',
    action: () => router.push('/pos'),
  },
  {
    key: 'b', ctrl: true,
    description: 'Mostrar / Ocultar menú lateral',
    group: 'Navegación',
    action: () => toggleSidebar(),
  },
  {
    key: 'i', ctrl: true,
    description: 'Ir a Informes',
    group: 'Navegación',
    action: () => router.push({ name: 'MasterReports' }),
  },

  // Ayuda
  {
    key: '?',
    description: 'Mostrar atajos de teclado',
    group: 'Ayuda',
    action: () => { showShortcutsPanel.value = !showShortcutsPanel.value; },
  },
  {
    key: 'Escape',
    description: 'Cerrar paneles / modales',
    group: 'Ayuda',
    action: () => { showShortcutsPanel.value = false; },
  },
];

// Agrupar atajos por grupo para el panel
const shortcutsByGroup = computed(() => {
  const groups: Record<string, KeyboardShortcut[]> = {};
  for (const s of shortcuts) {
    const list = groups[s.group] ?? [];
    list.push(s);
    groups[s.group] = list;
  }
  return groups;
});

useKeyboardShortcuts(shortcuts);
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-bone">

    <!-- ── Overlay móvil ────────────────────────────────────────────────────── -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-30 bg-navy/60 lg:hidden"
      @click="isSidebarOpen = false"
    />

    <!-- ══ SIDEBAR PRINCIPAL ══════════════════════════════════════════════════ -->
    <aside
      :class="[
        'flex flex-col bg-navy text-white transition-all duration-200 z-40',
        'fixed inset-y-0 left-0',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:static lg:translate-x-0',
        isSidebarCollapsed ? 'lg:w-0 lg:overflow-hidden lg:min-w-0' : 'lg:w-64',
        'w-64',
      ]"
    >
      <div class="flex items-center justify-between border-b border-navy-light p-4">
        <span class="text-xl font-bold tracking-wider">{{ t('sidebar.appName') }}</span>
        <button
          type="button"
          class="rounded-lg p-1 text-slate-300 hover:bg-navy-light lg:hidden"
          :aria-label="t('common.close')"
          @click="isSidebarOpen = false"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto p-4">
        <RouterLink to="/dashboard" v-slot="{ isExactActive }" @click="isSidebarOpen = false">
          <span
            :class="[
              'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
              isExactActive ? 'bg-brand text-white shadow-xs' : 'text-slate-200 hover:bg-navy-light hover:text-white',
            ]"
          >
            <span class="text-base shrink-0 leading-none">📊</span>
            <span>{{ t('sidebar.dashboard') }}</span>
          </span>
        </RouterLink>
        <SidebarTreeNode v-for="entry in visibleSidebarTree" :key="entry.labelKey" :entry="entry" />
      </nav>

      <div class="border-t border-navy-light p-4 text-xs text-slate-500">
        v0.1.0 &mdash; MVP
      </div>
    </aside>

    <!-- ══ PANEL DERECHO ══════════════════════════════════════════════════════ -->
    <div class="flex flex-1 flex-col overflow-hidden">

      <!-- Top navbar -->
      <header class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 sm:px-6">
        <div class="flex items-center gap-3">

          <!-- ☰ Hamburguesa — siempre visible -->
          <button
            id="main-sidebar-toggle"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            :title="isSidebarCollapsed ? 'Mostrar menú (Ctrl+B)' : 'Ocultar menú (Ctrl+B)'"
            @click="toggleSidebar"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div class="hidden text-sm font-semibold text-gray-600 sm:block">
            {{ t('navbar.title') }}
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-4">
          <span class="hidden text-sm font-semibold text-gray-700 md:block">
            {{ authStore.user?.nombreCompleto ?? t('navbar.userSession') }}
          </span>

          <!-- Botón atajos de teclado -->
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-xs font-bold text-gray-500 transition hover:bg-gray-100"
            title="Atajos de teclado (?)"
            @click="showShortcutsPanel = !showShortcutsPanel"
          >
            ?
          </button>

          <!-- Logout -->
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            title="Cerrar sesión (Ctrl+U)"
            @click="handleLogout"
          >
            {{ t('auth.logout') }}
          </button>
        </div>
      </header>

      <!-- Área de contenido -->
      <main
        :class="[
          'flex-1 bg-bone',
          isFullBleedRoute
            ? 'overflow-hidden flex flex-col p-0'
            : 'overflow-y-auto overflow-x-hidden p-4 sm:p-6',
        ]"
      >
        <RouterView :class="isFullBleedRoute ? 'h-full' : ''" />
      </main>
    </div>

    <!-- ══ PANEL DE ATAJOS DE TECLADO ═════════════════════════════════════════ -->
    <Transition
      enter-active-class="transition duration-150"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showShortcutsPanel"
        class="fixed inset-0 z-50 flex items-center justify-center print:hidden"
        @click.self="showShortcutsPanel = false"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showShortcutsPanel = false" />

        <!-- Panel -->
        <div class="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 class="text-base font-black text-gray-900">⌨️ Atajos de Teclado</h2>
              <p class="mt-0.5 text-xs text-gray-400">Comandos rápidos disponibles en toda la aplicación</p>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              @click="showShortcutsPanel = false"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Lista de grupos -->
          <div class="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            <div v-for="(groupShortcuts, groupName) in shortcutsByGroup" :key="groupName" class="px-6 py-4">
              <h3 class="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">{{ groupName }}</h3>
              <div class="space-y-2">
                <div
                  v-for="sc in groupShortcuts"
                  :key="formatShortcut(sc)"
                  class="flex items-center justify-between"
                >
                  <span class="text-sm text-gray-700">{{ sc.description }}</span>
                  <kbd class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs font-bold text-gray-600 shadow-sm">
                    {{ formatShortcut(sc) }}
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-gray-100 px-6 py-3 text-center text-xs text-gray-400">
            Presiona <kbd class="mx-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono font-bold">?</kbd> en cualquier momento para abrir este panel
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>
