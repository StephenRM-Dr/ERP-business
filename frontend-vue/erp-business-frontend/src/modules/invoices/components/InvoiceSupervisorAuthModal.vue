<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import apiClient from '@/api/axios-client';

interface Props {
  show: boolean;
  actionTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  actionTitle: 'Autorización de Venta a Crédito',
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'authorized', supervisorName: string): void;
}>();

const supervisorUsername = ref<string>('');
const supervisorPassword = ref<string>('');
const isVerifying = ref<boolean>(false);
const errorMessage = ref<string>('');

const passwordInputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.show,
  (val) => {
    if (val) {
      supervisorUsername.value = '';
      supervisorPassword.value = '';
      errorMessage.value = '';
      isVerifying.value = false;
      nextTick(() => {
        passwordInputRef.value?.focus();
      });
    }
  },
);

async function handleVerify(): Promise<void> {
  errorMessage.value = '';

  if (!supervisorPassword.value) {
    errorMessage.value = 'Debe ingresar la clave de autorización';
    passwordInputRef.value?.focus();
    return;
  }

  isVerifying.value = true;

  try {
    let authorized = false;
    let authName = '';

    try {
      const { data } = await apiClient.post('/auth/verify-supervisor', {
        username: supervisorUsername.value.trim() || undefined,
        password: supervisorPassword.value,
      });
      if (data?.success) {
        authorized = true;
        authName = data.authorizedBy || 'Supervisor';
      }
    } catch {
      // Fallback a /auth/login
      const loginRes = await apiClient.post('/auth/login', {
        username: supervisorUsername.value.trim() || 'admin',
        password: supervisorPassword.value,
      });
      if (loginRes.data?.accessToken || loginRes.data?.user) {
        authorized = true;
        authName = loginRes.data?.user?.nombreCompleto || loginRes.data?.user?.username || 'Administrador';
      }
    }

    if (authorized) {
      emit('authorized', authName);
      emit('close');
    } else {
      errorMessage.value = 'Autorización denegada o clave incorrecta';
    }
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || 'Clave de supervisor/administrador incorrecta o no autorizada';
  } finally {
    isVerifying.value = false;
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Header with Alert Badge -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-amber-600 to-amber-700 text-white">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center text-lg shadow-inner">
            🔐
          </div>
          <div>
            <h3 class="text-sm font-bold text-white tracking-wide">{{ actionTitle }}</h3>
            <p class="text-[11px] text-amber-100">Requiere clave de supervisor o administrador</p>
          </div>
        </div>

        <button
          type="button"
          class="rounded-lg p-1 text-amber-200 hover:bg-white/10 hover:text-white transition cursor-pointer"
          @click="emit('close')"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Error message -->
      <div
        v-if="errorMessage"
        class="mx-4 mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-semibold flex items-center gap-1.5"
      >
        <span>⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>

      <form class="p-5 space-y-3.5" @submit.prevent="handleVerify">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Usuario Supervisor (Opcional si usa clave de Admin):
          </label>
          <input
            v-model="supervisorUsername"
            type="text"
            placeholder="Ej: admin o supervisor"
            class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 shadow-xs"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Clave de Autorización <span class="text-rose-500">*</span>:
          </label>
          <input
            ref="passwordInputRef"
            v-model="supervisorPassword"
            type="password"
            placeholder="••••••••"
            class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 shadow-xs"
            required
          />
        </div>

        <!-- Buttons -->
        <div class="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="isVerifying"
            class="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
          >
            <span v-if="isVerifying">Verificando...</span>
            <span v-else>Autorizar [Enter]</span>
          </button>
        </div>
      </form>

    </div>
  </div>
</template>
