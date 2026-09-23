import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

export interface PaginationState<T> {
  page: Ref<number>;
  pageSize: Ref<number>;
  totalItems: ComputedRef<number>;
  totalPages: ComputedRef<number>;
  pageItems: ComputedRef<T[]>;
  rangeStart: ComputedRef<number>;
  rangeEnd: ComputedRef<number>;
  resetPage: () => void;
}

/**
 * Client-side pagination over an already-filtered list. Once the backend
 * exposes paginated endpoints this composable is replaced by page/limit
 * query params, keeping the same component API.
 */
export function usePagination<T>(
  source: ComputedRef<T[]>,
  initialPageSize = 10,
): PaginationState<T> {
  const page = ref<number>(1);
  const pageSize = ref<number>(initialPageSize);

  const totalItems = computed<number>(() => source.value.length);

  const totalPages = computed<number>(() =>
    Math.max(1, Math.ceil(totalItems.value / pageSize.value)),
  );

  // Filters can shrink the list below the current page; clamp instead of
  // showing an empty page.
  watch([totalPages, pageSize], () => {
    if (page.value > totalPages.value) {
      page.value = totalPages.value;
    }
  });

  const pageItems = computed<T[]>(() =>
    source.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
  );

  const rangeStart = computed<number>(() =>
    totalItems.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1,
  );

  const rangeEnd = computed<number>(() =>
    Math.min(page.value * pageSize.value, totalItems.value),
  );

  function resetPage(): void {
    page.value = 1;
  }

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    pageItems,
    rangeStart,
    rangeEnd,
    resetPage,
  };
}
