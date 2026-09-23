<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useCustomerStore } from '@/modules/customers/interfaces/customer.store';
import type { Customer, CustomerFormData } from '@/modules/customers/interfaces/customer.interface';

interface Props {
  show: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select-customer', customer: Customer): void;
}>();

const customerStore = useCustomerStore();

const documentType = ref<'V' | 'J' | 'E' | 'G'>('V');
const documentNumber = ref<string>('');
const firstName = ref<string>('');
const phone = ref<string>('');
const email = ref<string>('');
const isSaving = ref<boolean>(false);
const errorMessage = ref<string>('');

const docInputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.show,
  (val) => {
    if (val) {
      documentType.value = 'V';
      documentNumber.value = '';
      firstName.value = '';
      phone.value = '';
      email.value = '';
      errorMessage.value = '';
      isSaving.value = false;
      nextTick(() => {
        docInputRef.value?.focus();
      });
    }
  },
);

async function handleSave(): Promise<void> {
  errorMessage.value = '';

  const doc = documentNumber.value.trim().toUpperCase();
  const name = firstName.value.trim();

  if (!doc) {
    errorMessage.value = 'Debe ingresar el número de cédula o RIF';
    docInputRef.value?.focus();
    return;
  }

  if (!name) {
    errorMessage.value = 'Debe ingresar el nombre o razón social';
    return;
  }

  isSaving.value = true;

  try {
    const payload: CustomerFormData = {
      documentType: documentType.value,
      documentNumber: doc,
      firstName: name,
      lastName: '',
      phone: phone.value.trim(),
      email: email.value.trim(),
      creditLimit: 0,
      paymentTermsDays: 0,
      notes: 'Registrado desde Punto de Venta (Registro Rápido)',
      isSpecialTaxpayer: documentType.value === 'J' || documentType.value === 'G',
    };

    const newCustomer = await customerStore.addCustomer(payload);
    emit('select-customer', newCustomer);
    emit('close');
  } catch (err: any) {
    errorMessage.value = customerStore.saveError || 'Error al guardar el cliente. Verifique que el documento no esté duplicado.';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-[#0f2942] to-navy text-white">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-white/10 text-cyan-300 flex items-center justify-center text-base shadow-inner border border-white/10">
            ⚡
          </div>
          <div>
            <h3 class="text-sm font-bold text-white tracking-wide">Registro Rápido de Cliente [F3]</h3>
            <p class="text-[11px] text-slate-300">Crea el cliente y asígnalo de inmediato</p>
          </div>
        </div>

        <button
          type="button"
          class="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
          @click="emit('close')"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Error Alert -->
      <div
        v-if="errorMessage"
        class="mx-4 mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-semibold flex items-center gap-1.5"
      >
        <span>⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Form Body -->
      <form class="p-5 space-y-3.5" @submit.prevent="handleSave">
        
        <!-- Documento (Tipo + Número) -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Cédula / RIF <span class="text-rose-500">*</span>
          </label>
          <div class="flex gap-2">
            <select
              v-model="documentType"
              class="w-20 rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-brand focus:bg-white shadow-xs"
            >
              <option value="V">V - Venezolano</option>
              <option value="J">J - Jurídico</option>
              <option value="E">E - Extranjero</option>
              <option value="G">G - Gubernamental</option>
            </select>
            <input
              ref="docInputRef"
              v-model="documentNumber"
              type="text"
              placeholder="Ej: 12345678"
              class="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs uppercase"
              required
            />
          </div>
        </div>

        <!-- Nombre / Razón Social -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Nombre y Apellido / Razón Social <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="firstName"
            type="text"
            placeholder="Ej: Juan Pérez o Distribuidora El Sol C.A."
            class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
            required
          />
        </div>

        <!-- Teléfono y Correo -->
        <div class="grid grid-cols-2 gap-2.5">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Teléfono (Opcional)</label>
            <input
              v-model="phone"
              type="tel"
              placeholder="0414-0000000"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Correo (Opcional)</label>
            <input
              v-model="email"
              type="email"
              placeholder="cliente@correo.com"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
            @click="emit('close')"
          >
            Cancelar [Esc]
          </button>
          <button
            type="submit"
            :disabled="isSaving"
            class="inline-flex items-center gap-1.5 rounded-xl bg-navy hover:bg-navy-light px-5 py-2 text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
          >
            <span v-if="isSaving">Guardando...</span>
            <span v-else>Guardar y Asignar [Enter]</span>
          </button>
        </div>

      </form>

    </div>
  </div>
</template>
