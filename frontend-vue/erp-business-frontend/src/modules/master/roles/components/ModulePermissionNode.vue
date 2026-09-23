<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { collectDescendantIds, type ModuleCatalogEntry } from '@/config/module-catalog';

const props = defineProps<{
  module: ModuleCatalogEntry;
  depth?: number;
}>();

const depth = props.depth ?? 0;
const modulosPermitidos = defineModel<string[]>('modulosPermitidos', { required: true });

const { t } = useI18n();

// A group renamed since a role was saved (e.g. the old flat "master" split
// into "maintenance"/"transactions"/etc) leaves that role with granted
// leaves but no matching group id in modulosPermitidos. Expanding whenever
// any descendant is already granted — not just on the group's own id —
// keeps those grants visible instead of silently collapsed.
const hasGrantedDescendant = computed(() =>
  props.module.children
    ? collectDescendantIds(props.module).some((id) => modulosPermitidos.value.includes(id))
    : false,
);
const isExpanded = computed(
  () => modulosPermitidos.value.includes(props.module.id) || hasGrantedDescendant.value,
);

// Checking a group is what reveals its children below it. Unchecking it also
// clears every descendant already selected, at any depth, so no permission
// stays granted "invisibly" once its parent group is hidden.
function toggle(): void {
  const index = modulosPermitidos.value.indexOf(props.module.id);
  if (index === -1) {
    modulosPermitidos.value = [...modulosPermitidos.value, props.module.id];
    return;
  }

  let next = modulosPermitidos.value.filter((id) => id !== props.module.id);
  if (props.module.children) {
    const descendantIds = new Set(collectDescendantIds(props.module));
    next = next.filter((id) => !descendantIds.has(id));
  }
  modulosPermitidos.value = next;
}
</script>

<template>
  <div>
    <label
      class="flex items-center gap-2 text-sm text-gray-700"
      :class="depth === 0 ? 'font-medium' : ''"
    >
      <input
        type="checkbox"
        :checked="modulosPermitidos.includes(module.id)"
        class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
        @change="toggle"
      />
      {{ t(module.labelKey) }}
    </label>

    <div v-if="module.children && isExpanded" class="mt-2 ml-6 space-y-2">
      <ModulePermissionNode
        v-for="child in module.children"
        :key="child.id"
        :module="child"
        v-model:modulos-permitidos="modulosPermitidos"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>
