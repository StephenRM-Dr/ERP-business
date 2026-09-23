<script setup lang="ts">
interface SpinnerIconProps {
  /** Tailwind size classes, e.g. "h-4 w-4". Defaults to a size that fits inline in a button next to text. */
  sizeClass?: string;
}

withDefaults(defineProps<SpinnerIconProps>(), {
  sizeClass: 'h-4 w-4',
});
</script>

<template>
  <svg
    :class="['animate-spin', sizeClass]"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path
      class="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
</template>
