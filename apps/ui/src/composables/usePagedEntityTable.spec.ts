import { describe, expect, it } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import { usePagedEntityTable } from './usePagedEntityTable.js';

describe('usePagedEntityTable', () => {
  it('paginates rows by current page and size', () => {
    const rows = ref(Array.from({ length: 26 }, (_, index) => ({ id: index + 1 })));
    const table = usePagedEntityTable({ rows, initialPageSize: 10 });

    expect(table.pagedRows.value).toHaveLength(10);
    expect(table.pagedRows.value.at(0)?.id).toBe(1);

    table.page.value = 2;
    expect(table.pagedRows.value.at(0)?.id).toBe(11);
  });

  it('resets to first page when watched filters change', async () => {
    const rows = ref(Array.from({ length: 50 }, (_, index) => ({ id: index + 1 })));
    const search = ref('');
    const filtered = computed(() =>
      rows.value.filter((row) => String(row.id).includes(search.value.trim()))
    );

    const table = usePagedEntityTable({ rows: filtered, resetPageOn: [search], initialPageSize: 10 });

    table.page.value = 3;
    search.value = '1';
    await nextTick();

    expect(table.page.value).toBe(1);
  });

  it('clamps page when filtered row count drops', async () => {
    const rows = ref(Array.from({ length: 25 }, (_, index) => ({ id: index + 1 })));
    const limit = ref(25);
    const filtered = computed(() => rows.value.slice(0, limit.value));

    const table = usePagedEntityTable({ rows: filtered, resetPageOn: [], initialPageSize: 10 });

    table.page.value = 3;
    limit.value = 8;
    await nextTick();

    expect(table.page.value).toBe(1);
    expect(table.totalRows.value).toBe(8);
    expect(table.pagedRows.value).toHaveLength(8);
  });
});
