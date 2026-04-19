<template>
  <Form @submit="handleSubmit" :validation-schema="validationSchema" :initial-values="initialValues">
    <!-- Name field -->
    <Field
      v-slot="{ field, meta }"
      name="name"
    >
      <div class="mb-3">
        <input
          v-bind="field"
          type="text"
          aria-label="Name"
          :class="[
            'flex-1 border rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 w-full',
            meta.touched && !meta.valid
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500',
            'dark:bg-gray-700 text-gray-900 dark:text-gray-100',
          ]"
        />
        <ErrorMessage name="name" as="p" class="mt-1 text-sm text-red-500" />
      </div>
    </Field>

    <!-- Color field -->
    <Field
      v-slot="{ field, meta }"
      name="colorCode"
    >
      <div class="mb-3">
        <input
          v-bind="field"
          type="color"
          aria-label="Color"
          :class="[
            'h-10 w-16 rounded cursor-pointer border',
            meta.touched && !meta.valid ? 'border-red-500' : 'border-gray-300 dark:border-gray-600',
          ]"
        />
        <ErrorMessage name="colorCode" as="p" class="mt-1 text-sm text-red-500" />
      </div>
    </Field>

    <!-- Description field -->
    <Field
      v-slot="{ field, meta }"
      name="description"
    >
      <div class="mb-3">
        <input
          v-bind="field"
          type="text"
          aria-label="Description"
          :class="[
            'w-full border rounded-md px-2 py-1 text-base sm:text-sm focus:outline-none focus:ring-2',
            meta.touched && !meta.valid
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500',
            'dark:bg-gray-700 text-gray-900 dark:text-gray-100',
          ]"
          placeholder="Optional description"
        />
        <ErrorMessage name="description" as="p" class="mt-1 text-sm text-red-500" />
      </div>
    </Field>

    <!-- Buttons -->
    <div class="flex gap-2">
      <button
        type="submit"
        class="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
      >
        Save
      </button>
      <button
        type="button"
        @click="$emit('cancel')"
        class="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        Cancel
      </button>
    </div>
  </Form>
</template>

<script setup lang="ts">
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const UpdateTagSchema = z.object({
  name: z.string().nonempty('Name is required'),
  colorCode: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Invalid hex color format',
  }),
  description: z.string().optional().nullable(),
})

type UpdateTagFormData = z.infer<typeof UpdateTagSchema>

interface Props {
  initialName: string
  initialColorCode: string
  initialDescription?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [values: UpdateTagFormData]
  cancel: []
}>()

const validationSchema = toTypedSchema(UpdateTagSchema)

const initialValues = {
  name: props.initialName,
  colorCode: props.initialColorCode,
  description: props.initialDescription ?? '',
}

const handleSubmit = (values: Record<string, unknown>) => {
  const formData = values as UpdateTagFormData
  emit('submit', formData)
}
</script>
