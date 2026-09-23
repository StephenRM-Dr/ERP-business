<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { CustomerFormData } from '../interfaces/customer.interface';

const props = defineProps<{
  initialData: CustomerFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: CustomerFormData];
  cancel: [];
}>();

const { t } = useI18n();

const form = reactive<CustomerFormData>({ ...props.initialData });

// Editing an existing customer swaps initialData after the store loads it.
watch(
  () => props.initialData,
  (data) => Object.assign(form, data),
);

const DOCUMENT_TYPES = ['V', 'E', 'J', 'G', 'P'] as const;

// Cédula/RIF: digits only, with an optional RIF check digit after a dash (e.g. 12345678-9).
const DOCUMENT_NUMBER_PATTERN = '^[0-9]{5,10}(-[0-9])?$';

// Local: 0424-123-4567 or 04241234567 (11 digits, starts with 0).
// With country code: +58-424-123-4567 or +584241234567 (10 digits, leading 0 dropped after +58).
// Dashes are accepted for readability but never required.
const PHONE_PATTERN = String.raw`^(0[0-9]{3}-?[0-9]{3}-?[0-9]{4}|\+58-?[1-9][0-9]{2}-?[0-9]{3}-?[0-9]{4})$`;

// \p{L} (any Unicode letter) instead of a-zA-Z so ñ/á/é/í/ó/ú/ü are accepted;
// the HTML pattern attribute compiles with the "u" flag, so \p{} works here.
const EMAIL_PATTERN = String.raw`^[^\s@]+@[^\s@]+\.[\p{L}]{2,}$`;

// A computed with get/set lets v-model stay on the template while every
// keystroke is sanitized before it reaches the form state — garbage
// characters never make it into `form`, instead of only being caught by
// the pattern check at submit time.
const documentNumber = computed<string>({
  get: () => form.documentNumber,
  set: (value) => {
    form.documentNumber = value.replace(/[^0-9-]/g, '');
  },
});

const phone = computed<string>({
  get: () => form.phone,
  set: (value) => {
    form.phone = value.replace(/[^0-9+-]/g, '');
  },
});

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
      <label for="firstName" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('customers.form.firstName') }}
      </label>
      <input
        id="firstName"
        v-model="form.firstName"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="lastName" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('customers.form.lastName') }}
      </label>
      <input
        id="lastName"
        v-model="form.lastName"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="documentType" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('customers.form.documentType') }}
      </label>
      <select
        id="documentType"
        v-model="form.documentType"
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option v-for="type in DOCUMENT_TYPES" :key="type" :value="type">{{ type }}</option>
      </select>
    </div>

    <div>
      <label for="documentNumber" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('customers.form.documentNumber') }}
      </label>
      <input
        id="documentNumber"
        v-model="documentNumber"
        type="text"
        inputmode="numeric"
        required
        :pattern="DOCUMENT_NUMBER_PATTERN"
        :title="t('customers.form.documentNumberHint')"
        placeholder="12345678 / 12345678-9"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
      <p class="mt-1 text-xs text-gray-400">{{ t('customers.form.documentNumberHint') }}</p>
    </div>

    <div>
      <label for="email" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('customers.form.email') }}
      </label>
      <input
        id="email"
        v-model="form.email"
        type="text"
        inputmode="email"
        autocomplete="email"
        :pattern="EMAIL_PATTERN"
        :title="t('customers.form.emailHint')"
        placeholder="cliente@dominio.com"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="phone" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('customers.form.phone') }}
      </label>
      <input
        id="phone"
        v-model="phone"
        type="text"
        required
        :pattern="PHONE_PATTERN"
        :title="t('customers.form.phoneHint')"
        placeholder="0424-123-4567"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
      <p class="mt-1 text-xs text-gray-400">{{ t('customers.form.phoneHint') }}</p>
    </div>

    <div>
      <label for="creditLimit" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('customers.form.creditLimit') }}
      </label>
      <input
        id="creditLimit"
        v-model.number="form.creditLimit"
        type="number"
        min="0"
        step="0.01"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="paymentTermsDays" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('customers.form.paymentTermsDays') }}
      </label>
      <input
        id="paymentTermsDays"
        v-model.number="form.paymentTermsDays"
        type="number"
        min="0"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="sm:col-span-2">
      <label for="notes" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('customers.form.notes') }}
      </label>
      <textarea
        id="notes"
        v-model="form.notes"
        rows="3"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="flex items-center gap-2 sm:col-span-2">
      <input
        id="isSpecialTaxpayer"
        v-model="form.isSpecialTaxpayer"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
      />
      <label for="isSpecialTaxpayer" class="text-sm text-gray-700">
        {{ t('customers.form.isSpecialTaxpayer') }}
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
        to="/customers"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('customers.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
