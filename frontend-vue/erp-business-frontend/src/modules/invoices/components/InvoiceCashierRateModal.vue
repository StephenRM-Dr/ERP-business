<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import apiClient from '@/api/axios-client';
import { useExchangeRatesStore } from '@/modules/currencies/exchange-rates.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useAuthStore } from '@/modules/auth/auth.store';
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue';

interface Props {
  show: boolean;
  currentCashierName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  currentCashierName: '',
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'rateUpdated', newRate: number, currencyCode: string): void;
  (e: 'cashierAuthenticated', cashierName: string): void;
}>();

const exchangeRatesStore = useExchangeRatesStore();
const currenciesStore = useCurrenciesStore();
const authStore = useAuthStore();

const activeTab = ref<'rate' | 'cashier'>('rate');

// --- Tasa State ---
const selectedCurrency = ref<string>('VES');
const newRateValue = ref<number | null>(null);
const rateSupervisorPassword = ref<string>('');
const isSavingRate = ref<boolean>(false);
const rateMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

// --- Cashier State ---
const cashierUsername = ref<string>('');
const cashierPassword = ref<string>('');
const isVerifyingCashier = ref<boolean>(false);
const cashierMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

const rateInputRef = ref<HTMLInputElement | null>(null);
const cashierPasswordInputRef = ref<HTMLInputElement | null>(null);

const currentActiveRate = computed(() => {
  return exchangeRatesStore.rateFor(selectedCurrency.value as any) || 0;
});

const availableCurrencies = computed(() => {
  return currenciesStore.currencies.filter((c) => c.isActive && c.code !== 'USD');
});

watch(
  () => props.show,
  (val) => {
    if (val) {
      rateMessage.value = null;
      cashierMessage.value = null;
      rateSupervisorPassword.value = '';
      cashierPassword.value = '';
      cashierUsername.value = authStore.user?.username || '';
      
      const current = exchangeRatesStore.rateFor('VES');
      newRateValue.value = current > 0 ? current : null;

      nextTick(() => {
        if (activeTab.value === 'rate') {
          rateInputRef.value?.focus();
          rateInputRef.value?.select();
        } else {
          cashierPasswordInputRef.value?.focus();
        }
      });
    }
  },
);

watch(activeTab, (tab) => {
  nextTick(() => {
    if (tab === 'rate') {
      rateInputRef.value?.focus();
      rateInputRef.value?.select();
    } else {
      cashierPasswordInputRef.value?.focus();
    }
  });
});

async function handleSaveRate(): Promise<void> {
  rateMessage.value = null;

  if (!newRateValue.value || newRateValue.value <= 0) {
    rateMessage.value = { type: 'error', text: 'Ingresa un valor válido para la tasa de cambio' };
    return;
  }

  isSavingRate.value = true;

  try {
    // Si se especificó contraseña, validamos permisos primero
    if (rateSupervisorPassword.value.trim()) {
      const authRes = await apiClient.post('/auth/verify-supervisor', {
        password: rateSupervisorPassword.value.trim(),
      });
      if (!authRes.data?.success) {
        rateMessage.value = { type: 'error', text: 'Contraseña de autorización no válida' };
        isSavingRate.value = false;
        return;
      }
    }

    // Registrar nueva tasa
    await exchangeRatesStore.registerRate({
      currencyCode: selectedCurrency.value as any,
      rate: newRateValue.value,
    });

    rateMessage.value = {
      type: 'success',
      text: `¡Tasa de ${selectedCurrency.value} actualizada a ${newRateValue.value.toLocaleString('es-VE', { minimumFractionDigits: 2 })}!`,
    };

    emit('rateUpdated', newRateValue.value, selectedCurrency.value);

    setTimeout(() => {
      emit('close');
    }, 1200);
  } catch (err: any) {
    rateMessage.value = {
      type: 'error',
      text: err?.response?.data?.message || err?.message || 'Error al guardar la nueva tasa de cambio',
    };
  } finally {
    isSavingRate.value = false;
  }
}

async function handleAuthenticateCashier(): Promise<void> {
  cashierMessage.value = null;

  if (!cashierPassword.value) {
    cashierMessage.value = { type: 'error', text: 'Debes ingresar la contraseña del cajero' };
    cashierPasswordInputRef.value?.focus();
    return;
  }

  isVerifyingCashier.value = true;

  try {
    let authorized = false;
    let authName = '';

    try {
      const res = await apiClient.post('/auth/verify-supervisor', {
        username: cashierUsername.value.trim() || undefined,
        password: cashierPassword.value,
      });
      if (res.data?.success) {
        authorized = true;
        authName = res.data.authorizedBy || cashierUsername.value || 'Cajero';
      }
    } catch {
      // Fallback a /auth/login
      const loginRes = await apiClient.post('/auth/login', {
        username: cashierUsername.value.trim() || authStore.user?.username || 'admin',
        password: cashierPassword.value,
      });
      if (loginRes.data?.accessToken || loginRes.data?.user) {
        authorized = true;
        authName = loginRes.data?.user?.nombreCompleto || loginRes.data?.user?.username || 'Cajero';
      }
    }

    if (authorized) {
      cashierMessage.value = {
        type: 'success',
        text: `¡Cajero autenticado con éxito: ${authName}!`,
      };
      emit('cashierAuthenticated', authName);

      setTimeout(() => {
        emit('close');
      }, 1000);
    } else {
      cashierMessage.value = { type: 'error', text: 'Contraseña o usuario incorrecto' };
    }
  } catch (err: any) {
    cashierMessage.value = {
      type: 'error',
      text: err?.response?.data?.message || 'Credenciales de cajero incorrectas',
    };
  } finally {
    isVerifyingCashier.value = false;
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      
      <!-- Top Header -->
      <div class="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-navy via-navy to-blue-900 text-white border-b border-navy-light">
        <div class="flex items-center gap-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-inner text-lg">
            💱
          </div>
          <div>
            <h3 class="text-sm font-black tracking-wide text-white">CONTROL DE TASA Y CAJERO</h3>
            <p class="text-[11px] text-blue-200">Ajuste de tasa del día y sesión del POS</p>
          </div>
        </div>

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

      <!-- Navigation Tabs -->
      <div class="flex border-b border-slate-200 bg-slate-50 px-4 pt-2">
        <button
          type="button"
          :class="[
            'flex-1 py-2 text-xs font-bold text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5',
            activeTab === 'rate'
              ? 'border-brand text-brand bg-white rounded-t-lg shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          ]"
          @click="activeTab = 'rate'"
        >
          <span>💱</span>
          <span>Cambiar Tasa del Día</span>
        </button>
        <button
          type="button"
          :class="[
            'flex-1 py-2 text-xs font-bold text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5',
            activeTab === 'cashier'
              ? 'border-brand text-brand bg-white rounded-t-lg shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          ]"
          @click="activeTab = 'cashier'"
        >
          <span>👤</span>
          <span>Clave / Cajero Activo</span>
        </button>
      </div>

      <!-- TAB 1: CAMBIAR TASA -->
      <div v-if="activeTab === 'rate'" class="p-5 space-y-4">
        
        <!-- Mensajes -->
        <div
          v-if="rateMessage"
          :class="[
            'rounded-xl p-3 text-xs font-bold flex items-center gap-2',
            rateMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          ]"
        >
          <span>{{ rateMessage.type === 'success' ? '✅' : '⚠️' }}</span>
          <span>{{ rateMessage.text }}</span>
        </div>

        <!-- Moneda Selector -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Moneda / Divisa a Modificar:
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="curr in availableCurrencies"
              :key="curr.code"
              type="button"
              :class="[
                'flex items-center justify-between rounded-xl border p-2.5 text-xs font-bold transition cursor-pointer',
                selectedCurrency === curr.code
                  ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              ]"
              @click="selectedCurrency = curr.code"
            >
              <span>{{ curr.symbol }} {{ curr.name }}</span>
              <span class="rounded bg-blue-200 px-1.5 py-0.5 text-[10px] font-black text-blue-950 font-mono">{{ curr.code }}</span>
            </button>
          </div>
        </div>

        <!-- Tasa Actual & Input Nueva Tasa -->
        <div class="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-3">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-500 font-semibold">Tasa Actual del Sistema:</span>
            <span class="font-black text-slate-800 font-mono text-sm">
              1 USD = {{ currentActiveRate > 0 ? currentActiveRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0.00' }} {{ selectedCurrency }}
            </span>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Nueva Tasa ({{ selectedCurrency }} por cada 1 USD) <span class="text-rose-500">*</span>:
            </label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-xs font-black text-slate-400 font-mono">
                {{ selectedCurrency }}
              </span>
              <input
                ref="rateInputRef"
                v-model.number="newRateValue"
                type="number"
                step="0.0001"
                min="0.0001"
                placeholder="Ej: 54.50"
                class="w-full rounded-xl border border-slate-300 bg-white pl-12 pr-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-mono shadow-xs"
                @keyup.enter="handleSaveRate"
              />
            </div>
          </div>
        </div>

        <!-- Contraseña de Cajero / Supervisor (Opcional/Requerida) -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Contraseña del Cajero o Administrador:
          </label>
          <input
            v-model="rateSupervisorPassword"
            type="password"
            placeholder="Ingresa clave para autorizar cambio"
            class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
            @keyup.enter="handleSaveRate"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="isSavingRate || !newRateValue"
            class="inline-flex items-center gap-1.5 rounded-xl bg-brand hover:bg-brand-hover px-5 py-2 text-xs font-black text-white shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
            @click="handleSaveRate"
          >
            <SpinnerIcon v-if="isSavingRate" />
            <span v-else>💾</span>
            <span>{{ isSavingRate ? 'Guardando...' : 'Aplicar Nueva Tasa [Enter]' }}</span>
          </button>
        </div>

      </div>

      <!-- TAB 2: IDENTIFICAR / AUTENTICAR CAJERO -->
      <div v-if="activeTab === 'cashier'" class="p-5 space-y-4">
        
        <!-- Mensajes -->
        <div
          v-if="cashierMessage"
          :class="[
            'rounded-xl p-3 text-xs font-bold flex items-center gap-2',
            cashierMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          ]"
        >
          <span>{{ cashierMessage.type === 'success' ? '✅' : '⚠️' }}</span>
          <span>{{ cashierMessage.text }}</span>
        </div>

        <div class="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
          <div class="font-bold flex items-center gap-1.5">
            <span>👤</span>
            <span>Cajero Actual en Turno:</span>
          </div>
          <p class="font-black text-sm text-blue-950 mt-1">
            {{ currentCashierName || authStore.user?.nombreCompleto || 'Sin cajero asignado' }}
          </p>
        </div>

        <form class="space-y-3" @submit.prevent="handleAuthenticateCashier">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Usuario del Cajero:
            </label>
            <input
              v-model="cashierUsername"
              type="text"
              placeholder="Ej: cajero1 o admin"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Contraseña del Cajero <span class="text-rose-500">*</span>:
            </label>
            <input
              ref="cashierPasswordInputRef"
              v-model="cashierPassword"
              type="password"
              placeholder="••••••••"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
              required
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              @click="emit('close')"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isVerifyingCashier"
              class="inline-flex items-center gap-1.5 rounded-xl bg-navy hover:bg-navy-light px-5 py-2 text-xs font-bold text-white shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <SpinnerIcon v-if="isVerifyingCashier" />
              <span v-else>🔐</span>
              <span>{{ isVerifyingCashier ? 'Verificando...' : 'Iniciar Turno / Autenticar' }}</span>
            </button>
          </div>
        </form>

      </div>

    </div>
  </div>
</template>
