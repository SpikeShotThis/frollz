import { defineStore } from 'pinia';
import { ref } from 'vue';
import { listReferenceValuesQuerySchema, referenceValueSchema, type ReferenceValueKind } from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';
import { readApiData } from '../composables/api-envelope.js';

export const useReferenceValuesStore = defineStore('reference-values', () => {
  const { request } = useApi();
  const suggestionsByKind = ref<Record<string, string[]>>({});

  async function loadSuggestions(kind: ReferenceValueKind, query = '', limit = 10): Promise<string[]> {
    const parsed = listReferenceValuesQuerySchema.parse({ kind, q: query, limit });
    const params = new URLSearchParams({
      kind: parsed.kind,
      q: parsed.q,
      limit: String(parsed.limit)
    });

    const response = await request(`/api/v1/reference/values?${params.toString()}`);
    const values = referenceValueSchema.array().parse(await readApiData(response));
    const next = values.map((item) => item.value);
    suggestionsByKind.value[kind] = next;
    return next;
  }

  function getSuggestions(kind: ReferenceValueKind): string[] {
    return suggestionsByKind.value[kind] ?? [];
  }

  return {
    loadSuggestions,
    getSuggestions
  };
});
