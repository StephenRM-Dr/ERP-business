<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '../auth.store';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const username = ref<string>('');
const password = ref<string>('');
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string>('');

const canSubmit = computed<boolean>(
  () => username.value.trim() !== '' && password.value !== '' && !isSubmitting.value,
);

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) {
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await authStore.login({ username: username.value.trim(), password: password.value });

    // Return the user to the page they originally requested, if any.
    const redirectPath = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.push(redirectPath);
  } catch {
    errorMessage.value = t('auth.invalidCredentials');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-xl font-bold text-gray-800">{{ t('auth.title') }}</h1>

    <form class="space-y-5" novalidate @submit.prevent="handleSubmit">
      <div>
        <label for="login-username" class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('auth.username') }}
        </label>
        <input
          id="login-username"
          v-model="username"
          type="text"
          autocomplete="username"
          :placeholder="t('auth.usernamePlaceholder')"
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div>
        <label for="login-password" class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('auth.password') }}
        </label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <p
        v-if="errorMessage"
        class="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600"
      >
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        :disabled="!canSubmit"
        class="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {{ isSubmitting ? t('auth.submitting') : t('auth.submit') }}
      </button>
    </form>
  </div>
</template>
