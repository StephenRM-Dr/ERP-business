<script setup lang="ts">
import { inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { isSidebarGroup, type SidebarEntry } from './sidebar-tree';

const props = defineProps<{
  entry: SidebarEntry;
  depth?: number;
}>();

const depth = props.depth ?? 0;
const { t } = useI18n();
const route = useRoute();
const closeSidebar = inject<() => void>('closeSidebar', () => {});

/** True if `path` matches this entry's own route, or any descendant's. */
function containsRoute(entry: SidebarEntry, path: string): boolean {
  if (isSidebarGroup(entry)) {
    return entry.children.some((child) => containsRoute(child, path));
  }
  return entry.route === path || entry.route === route.fullPath;
}

// Groups start collapsed so the sidebar isn't a wall of expanded sections on
// first load — except the one the user is already on, so refreshing or deep
// linking into a page doesn't hide where you are.
const isOpen = ref(isSidebarGroup(props.entry) && (containsRoute(props.entry, route.path) || containsRoute(props.entry, route.fullPath)));
</script>

<template>
  <div v-if="isSidebarGroup(entry)">
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-navy-light"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center gap-2.5 truncate">
        <span v-if="entry.icon" class="text-base shrink-0 leading-none">{{ entry.icon }}</span>
        <span class="truncate">{{ t(entry.labelKey) }}</span>
      </div>
      <span :class="['text-xs shrink-0 transition-transform text-slate-400', isOpen ? 'rotate-90' : '']" aria-hidden="true">
        ›
      </span>
    </button>

    <div v-if="isOpen" class="space-y-0.5 pl-3 border-l border-navy-light/40 ml-3.5 my-1">
      <SidebarTreeNode
        v-for="child in entry.children"
        :key="isSidebarGroup(child) ? child.labelKey : child.route"
        :entry="child"
        :depth="depth + 1"
      />
    </div>
  </div>

  <RouterLink v-else :to="entry.route" v-slot="{ isExactActive }" @click="closeSidebar">
    <span
      :class="[
        'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors',
        route.fullPath === entry.route || isExactActive
          ? 'bg-brand font-bold text-white shadow-xs'
          : 'text-slate-300 hover:bg-navy-light hover:text-white',
      ]"
    >
      <span v-if="entry.icon" class="text-sm shrink-0 leading-none">{{ entry.icon }}</span>
      <span class="truncate">{{ t(entry.labelKey) }}</span>
    </span>
  </RouterLink>
</template>
