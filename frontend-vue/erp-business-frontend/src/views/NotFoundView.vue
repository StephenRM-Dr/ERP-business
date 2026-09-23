<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="flex h-screen flex-col items-center justify-center bg-gray-50 text-center">
    <p class="text-6xl font-extrabold text-navy">404</p>
    <h1 class="mt-4 text-xl font-semibold text-gray-800">{{ t('notFound.title') }}</h1>
    <p class="mt-2 text-sm text-gray-500">{{ t('notFound.description') }}</p>
    <RouterLink
      to="/"
      class="mt-6 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
    >
      {{ t('notFound.backHome') }}
    </RouterLink>
  </div>
</template>
