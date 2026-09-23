<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-navy px-4">
    <div class="mb-8 text-center">
      <p class="text-2xl font-bold tracking-wider text-white">
        {{ t('sidebar.appName') }}
      </p>
      <p class="mt-1 text-sm text-slate-400">{{ t('navbar.title') }}</p>
    </div>

    <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <RouterView />
    </div>
  </div>
</template>
