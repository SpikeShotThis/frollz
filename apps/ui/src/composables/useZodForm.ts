import { reactive, ref } from 'vue';
import type { ZodTypeAny } from 'zod';

export function useZodForm<TSchema extends ZodTypeAny>(schema: TSchema, initialValues: TSchema['_input'] & object) {
  const values = reactive(structuredClone(initialValues)) as TSchema['_input'];
  const errors = ref<string[]>([]);

  function validate(): TSchema['_output'] | null {
    const result = schema.safeParse(values);

    if (!result.success) {
      errors.value = result.error.issues.map((issue: { message: string }) => issue.message);
      return null;
    }

    errors.value = [];
    return result.data;
  }

  return {
    values,
    errors,
    validate
  };
}
