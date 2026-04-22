import { computed, ref, toValue, watch, type MaybeRefOrGetter, type Ref, type WatchSource } from 'vue';

type UsePagedEntityTableOptions<TRow> = {
  rows: MaybeRefOrGetter<TRow[]>;
  resetPageOn?: WatchSource<unknown>[];
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: readonly number[];
};

function paginateRows<TRow>(rows: TRow[], page: number, pageSize: number): TRow[] {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;
  return rows.slice(start, start + safePageSize);
}

export function usePagedEntityTable<TRow>(options: UsePagedEntityTableOptions<TRow>): {
  page: Ref<number>;
  pageSize: Ref<number>;
  pageSizes: number[];
  totalRows: Readonly<Ref<number>>;
  pagedRows: Readonly<Ref<TRow[]>>;
} {
  const page = ref(options.initialPage ?? 1);
  const pageSize = ref(options.initialPageSize ?? 10);
  const pageSizes = [...(options.pageSizeOptions ?? [10, 25, 50])];

  const totalRows = computed(() => toValue(options.rows).length);
  const pagedRows = computed(() => paginateRows(toValue(options.rows), page.value, pageSize.value));

  watch([pageSize, ...(options.resetPageOn ?? [])], () => {
    page.value = 1;
  });

  watch(totalRows, (total) => {
    const maxPage = Math.max(1, Math.ceil(total / Math.max(1, pageSize.value)));
    if (page.value > maxPage) {
      page.value = maxPage;
    }
  });

  return {
    page,
    pageSize,
    pageSizes,
    totalRows,
    pagedRows
  };
}
