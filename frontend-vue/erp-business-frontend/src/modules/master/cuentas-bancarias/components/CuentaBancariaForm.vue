<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useBancoStore } from '@/modules/master/bancos/interfaces/banco.store';
import { useMonedaStore } from '@/modules/inventory/interfaces/moneda.store';
import type { CuentaBancariaFormData } from '../interfaces/cuenta-bancaria.interface';

const props = defineProps<{
  initialData: CuentaBancariaFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: CuentaBancariaFormData];
}>();

const { t } = useI18n();
const bancoStore = useBancoStore();
const monedaStore = useMonedaStore();

const TIPOS_CUENTA = ['CORRIENTE', 'AHORROS', 'FIDEICOMISO', 'EXTRANJERA'] as const;

onMounted(() => {
  if (bancoStore.bancoList.length === 0) {
    bancoStore.fetchBancos();
  }
  if (monedaStore.monedaList.length === 0) {
    monedaStore.fetchMonedas();
  }
});

const form = reactive<CuentaBancariaFormData>({ ...props.initialData });

// Editing an existing cuenta swaps initialData after the store loads it.
watch(
  () => props.initialData,
  (data) => Object.assign(form, data),
);

function handleSubmit(): void {
  emit('submit', { ...form });
}
</script>

<template>
  <form
    class="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2"
    @submit.prevent="handleSubmit"
  >
    <div>
      <label for="bancoId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.cuentasBancarias.form.bancoId') }}
      </label>
      <select
        id="bancoId"
        v-model.number="form.bancoId"
        required
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="0" disabled>{{ t('master.cuentasBancarias.form.selectBanco') }}</option>
        <option v-for="banco in bancoStore.sortedBancos" :key="banco.id" :value="Number(banco.id)">
          {{ banco.nombre }}
        </option>
      </select>
    </div>

    <div>
      <label for="numeroCuenta" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.cuentasBancarias.form.numeroCuenta') }}
      </label>
      <input
        id="numeroCuenta"
        v-model="form.numeroCuenta"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="monedaId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.cuentasBancarias.form.monedaId') }}
      </label>
      <select
        id="monedaId"
        v-model.number="form.monedaId"
        required
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="0" disabled>{{ t('master.cuentasBancarias.form.selectMoneda') }}</option>
        <option v-for="moneda in monedaStore.activeMonedas" :key="moneda.id" :value="moneda.id">
          {{ moneda.codigoIso }} — {{ moneda.descripcion }}
        </option>
      </select>
    </div>

    <div>
      <label for="tipoCuenta" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.cuentasBancarias.form.tipoCuenta') }}
      </label>
      <select
        id="tipoCuenta"
        v-model="form.tipoCuenta"
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option value="">{{ t('master.cuentasBancarias.form.selectTipoCuenta') }}</option>
        <option v-for="tipo in TIPOS_CUENTA" :key="tipo" :value="tipo">{{ tipo }}</option>
      </select>
    </div>

    <div class="sm:col-span-2">
      <label for="descripcion" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.cuentasBancarias.form.descripcion') }}
      </label>
      <input
        id="descripcion"
        v-model="form.descripcion"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="saldoConciliado" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.cuentasBancarias.form.saldoConciliado') }}
      </label>
      <input
        id="saldoConciliado"
        v-model.number="form.saldoConciliado"
        type="number"
        min="0"
        step="0.01"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="flex items-center gap-2 sm:col-span-2">
      <input
        id="activo"
        v-model="form.activo"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
      />
      <label for="activo" class="text-sm text-gray-700">
        {{ t('master.cuentasBancarias.form.isActive') }}
      </label>
    </div>

    <p
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-2"
    >
      {{ t(errorMessage) }}
    </p>

    <div class="flex justify-end gap-3 sm:col-span-2">
      <RouterLink
        to="/master/cuentas-bancarias"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('master.cuentasBancarias.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
