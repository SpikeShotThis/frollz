import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const UpdateTagSchema = z.object({
  name: z.string().nonempty('Name is required').optional(),
  colorCode: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Invalid hex color format',
  }).optional(),
  description: z.string().optional().nullable(),
})

type UpdateTagForm = z.infer<typeof UpdateTagSchema>

export function useTagForm() {
  const { handleSubmit, values, errors, setFieldValue, resetForm } = useForm<UpdateTagForm>({
    validationSchema: toTypedSchema(UpdateTagSchema),
  })

  return {
    handleSubmit,
    values,
    errors,
    setFieldValue,
    resetForm,
  }
}
