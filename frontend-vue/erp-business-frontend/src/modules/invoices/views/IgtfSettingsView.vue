<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { useIgtfStore } from '../igtf.store';

const { t } = useI18n();
const igtfStore = useIgtfStore();

// Copia local editable de los porcentajes por empresa
const localRates = ref<Record<number, number>>({});
const savedFeedback = ref<string | null>(null);

onMounted(async () => {
  await igtfStore.fetchIgtf();
  syncLocalRates();
});

function syncLocalRates(): void {
  for (const emp of igtfStore.empresas) {
    localRates.value[emp.id] = emp.igtf_porcentaje;
  }
}

async function handleToggle(empresaId: number): Promise<void> {
  await igtfStore.toggleEnabled(empresaId);
  showFeedback(`Estado de IGTF actualizado en base de datos`);
}

async function saveCompanyRate(empresaId: number): Promise<void> {
  const rate = localRates.value[empresaId];
  if (rate === undefined || isNaN(rate) || rate < 0 || rate > 100) return;
  await igtfStore.setRate(Number(rate), empresaId);
  showFeedback(`Porcentaje (${rate}%) guardado exitosamente en base de datos`);
}

function setPresetRate(empresaId: number, rate: number): void {
  localRates.value[empresaId] = rate;
  saveCompanyRate(empresaId);
}

function showFeedback(msg: string): void {
  savedFeedback.value = msg;
  setTimeout(() => {
    if (savedFeedback.value === msg) {
      savedFeedback.value = null;
    }
  }, 4000);
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ t('igtf.title') }}</h1>
        <p class="mt-1 text-sm text-gray-500">{{ t('igtf.description') }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 active:scale-95"
        :disabled="igtfStore.isLoading"
        title="Actualizar datos desde la base de datos"
        @click="igtfStore.fetchIgtf().then(syncLocalRates)"
      >
        <span :class="{ 'animate-spin': igtfStore.isLoading }">🔄</span>
        <span>Refrescar</span>
      </button>
    </div>

    <!-- Alerta de Éxito al Guardar en Base de Datos -->
    <div
      v-if="savedFeedback"
      class="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-xs transition"
    >
      <span class="text-emerald-600 font-bold">✅</span>
      <span>{{ savedFeedback }}</span>
    </div>

    <!-- Mensaje de Error -->
    <p v-if="igtfStore.error" class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
      {{ t(igtfStore.error) }}
    </p>

    <!-- Cargando -->
    <div v-if="igtfStore.isLoading && !igtfStore.isLoaded" class="py-12 text-center text-sm text-gray-500">
      Cargando configuración desde la base de datos...
    </div>

    <!-- Lista de Empresas -->
    <div v-else class="space-y-6">
      <div
        v-for="empresa in igtfStore.empresas"
        :key="empresa.id"
        class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
      >
        <!-- Encabezado de la Empresa -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl font-bold text-blue-600">
              🏢
            </span>
            <div>
              <h2 class="text-base font-bold text-gray-800">{{ empresa.nombre }}</h2>
              <p class="text-xs text-gray-500">RIF: {{ empresa.rif || 'No especificado' }} &bull; ID BD: {{ empresa.id }}</p>
            </div>
          </div>
          <div>
            <span
              :class="[
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                empresa.igtf_activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
              ]"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="empresa.igtf_activo ? 'bg-emerald-500' : 'bg-gray-400'" />
              {{ empresa.igtf_activo ? 'IGTF ACTIVO' : 'IGTF INACTIVO' }}
            </span>
          </div>
        </div>

        <!-- Fila 1: Switch Activar / Desactivar -->
        <div class="flex items-center justify-between border-b border-gray-100 py-4">
          <div>
            <p class="text-sm font-semibold text-gray-800">{{ t('igtf.enabled') }}</p>
            <p class="mt-0.5 text-xs text-gray-500">{{ t('igtf.enabledHint') }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs font-medium" :class="empresa.igtf_activo ? 'text-emerald-700' : 'text-gray-400'">
              {{ empresa.igtf_activo ? 'Habilitado' : 'Deshabilitado' }}
            </span>
            <ToggleSwitch
              :modelValue="empresa.igtf_activo"
              :ariaLabel="`${t('igtf.enabled')} - ${empresa.nombre}`"
              :disabled="igtfStore.isSaving"
              @update:modelValue="handleToggle(empresa.id)"
            />
          </div>
        </div>

        <!-- Fila 2: Porcentaje de Alícuota y Botón Guardar -->
        <div class="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div>
            <p class="text-sm font-semibold text-gray-800">{{ t('igtf.rate') }}</p>
            <p class="mt-0.5 text-xs text-gray-500">{{ t('igtf.rateHint') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <input
                :id="`igtf-rate-${empresa.id}`"
                v-model.number="localRates[empresa.id]"
                type="number"
                step="0.5"
                min="0"
                max="100"
                :disabled="igtfStore.isSaving"
                :aria-label="t('igtf.rate')"
                class="w-28 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm font-bold text-gray-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:bg-gray-50 disabled:text-gray-400"
                @keyup.enter="saveCompanyRate(empresa.id)"
              />
            </div>
            <span class="text-sm font-bold text-gray-600">%</span>

            <button
              type="button"
              class="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-100 active:scale-95"
              title="Fijar tasa estándar del 3.00% y guardar en BD"
              @click="setPresetRate(empresa.id, 3)"
            >
              Fijar 3%
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-hover active:scale-95 disabled:opacity-50"
              :disabled="igtfStore.isSaving"
              title="Guardar porcentaje en base de datos"
              @click="saveCompanyRate(empresa.id)"
            >
              <span>💾 Guardar</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detalle de persistencia técnica y Nota Legal -->
    <div class="mt-6 space-y-3">
      <div class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-600">
        <span class="flex items-center gap-1.5">
          <span class="text-sm">🗄️</span>
          <span><strong>Persistencia en Base de Datos:</strong> Tabla <code>empresas</code> &bull; Columnas: <code>igtf_activo</code> (boolean), <code>igtf_porcentaje</code> (numeric)</span>
        </span>
        <span class="font-mono text-emerald-700 font-semibold">PostgreSQL Conectado</span>
      </div>

      <div class="flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-xs text-blue-800">
        <span class="text-base">ℹ️</span>
        <p class="leading-relaxed">{{ t('igtf.legalNote') }}</p>
      </div>
    </div>
  </div>
</template>
