# Plan: Integrate regle + Zod for all UI forms

## Context
The branch `chore/use-vee-validate-and-zod-for-forms` aims to eliminate ad-hoc manual validation across all create/edit forms and replace the thin `useZodForm` composable with regle + Zod. Every create form currently has its own imperative validation (`if (!field.trim()) ...`), flat error banners, and no field-level feedback. After this change, regle drives all validation via the existing Zod schemas in `packages/schema` (using the Standard Schema spec), and Quasar's `error`/`error-message` props display inline field-level errors.

**Why regle instead of vee-validate:**
- vee-validate's `@vee-validate/zod` adapter doesn't support Zod 4.x (this codebase uses Zod 4)
- regle implements the Standard Schema spec and supports Zod 3.24+ natively via `@regle/schemas`
- regle is lightweight, headless, and designed specifically for Vue 3 Composition API
- regle provides the same field-level reactivity with simpler API surface

**User decisions recorded:**
- `expirationDate`: keep `filmCreateRequestSchema` as-is; composable transforms YYYY-MM-DD → ISO datetime before API call
- `occurredAt`: keep `createFilmJourneyEventRequestSchema` as-is (z.iso.datetime()); UI computes `:00.000Z` suffix before submit
- Device form: single `useRegleSchema` with full `createFilmDeviceRequestSchema` discriminated union
- Film event form: per-state Zod schemas in packages/schema
- `useZodForm.ts`: delete entirely

---

## Step 0 — Install packages (Done)

Install regle with Standard Schema support:
```bash
pnpm --filter @frollz2/ui add @regle/schemas
```

**Package details:**
- `@regle/schemas` — Provides `useRegleSchema` composable for Zod integration via Standard Schema spec
- Compatible with Zod 3.24+ (this codebase uses Zod 4.x ✓)
- No additional adapters needed — regle natively implements the Standard Schema specification

Files changed: `apps/ui/package.json`

---

## Step 1 — Add form schemas to packages/schema

Add to `packages/schema/src/film.ts`:

### 1a. `filmCreateFormSchema`
Derived from `filmCreateRequestSchema`, overrides only `expirationDate` since the date input produces YYYY-MM-DD strings, not ISO datetimes. The submit handler converts.

```ts
export const filmCreateFormSchema = filmCreateRequestSchema.extend({
  expirationDate: z.string().optional(), // YYYY-MM-DD; composable converts to ISO
});
export type FilmCreateFormData = z.infer<typeof filmCreateFormSchema>;
```

### 1b. Per-state event form schemas
The existing `filmJourneyEventData*Schema` schemas model the API's `eventData` object. These new schemas model what the HTML form captures (simpler, flat, no `loadTargetType` discrimination — that's derived in the submit handler).

```ts
const baseEventFormFields = {
  occurredAt: z.string().min(1, 'Required'), // datetime-local string, e.g. "2024-06-01T12:00"
  notes: z.string().optional(),
};

export const storedEventFormSchema    = z.object({ ...baseEventFormFields, storageLocationId: idSchema });
export const loadedEventFormSchema    = z.object({ ...baseEventFormFields, deviceId: idSchema, slotNumber: z.union([z.literal(1), z.literal(2)]).optional(), intendedPushPull: z.number().int().optional() });
export const exposedEventFormSchema   = z.object(baseEventFormFields);
export const removedEventFormSchema   = z.object(baseEventFormFields);
export const sentForDevEventFormSchema= z.object({ ...baseEventFormFields, labName: z.string().optional(), labContact: z.string().optional(), actualPushPull: z.number().int().optional() });
export const developedEventFormSchema = z.object({ ...baseEventFormFields, labName: z.string().optional(), actualPushPull: z.number().int().optional() });
export const scannedEventFormSchema   = z.object({ ...baseEventFormFields, scannerOrSoftware: z.string().optional(), scanLink: z.string().optional() });
export const archivedEventFormSchema  = z.object(baseEventFormFields);
export const purchasedEventFormSchema = z.object(baseEventFormFields);

export const filmEventFormSchemas = {
  purchased:   purchasedEventFormSchema,
  stored:      storedEventFormSchema,
  loaded:      loadedEventFormSchema,
  exposed:     exposedEventFormSchema,
  removed:     removedEventFormSchema,
  sent_for_dev:sentForDevEventFormSchema,
  developed:   developedEventFormSchema,
  scanned:     scannedEventFormSchema,
  archived:    archivedEventFormSchema,
} as const;

export type FilmEventFormSchemas = typeof filmEventFormSchemas;
```

Also export the per-schema types for use in [id].vue.

Files changed: `packages/schema/src/film.ts`

---

## Step 2 — Delete useZodForm

Delete `apps/ui/src/composables/useZodForm.ts`.

---

## Step 3 — Auth forms (login.vue, register.vue)

**Pattern** (same for both):
- Replace `useZodForm` with `useRegleSchema(reactive({ email: '', password: '' }), loginRequestSchema)`
- Access field values via `r$.$value.email` (two-way bindable)
- Access field errors via `r$.email.$error` (boolean) and `r$.email.$errors` (string array)
- Bind Quasar inputs: `v-model="r$.$value.email"` `:error="r$.email.$error"` `:error-message="r$.email.$errors[0]"`
- Remove the `formError` validation banner; keep only a server-error banner for API errors
- Call `r$.$validate()` in submit; returns `{ valid, data }` with typed data

```ts
import { reactive } from 'vue';
import { useRegleSchema } from '@regle/schemas';
import { loginRequestSchema } from '@frollz2/schema';

const form = reactive({ email: '', password: '' });
const { r$ } = useRegleSchema(form, loginRequestSchema);

async function submit() {
  const { valid, data } = await r$.$validate();
  if (!valid) return;
  
  // data is fully typed LoginRequest
  await authStore.login(data);
  await router.push('/dashboard');
}
```

**Template pattern:**
```vue
<q-input
  v-model="r$.$value.email"
  :error="r$.email.$error"
  :error-message="r$.email.$errors[0]"
  label="Email"
/>
```

Files changed: `apps/ui/src/pages/auth/login.vue`, `apps/ui/src/pages/auth/register.vue`

---

## Step 4 — FilmCreateDialog: move vee-validate into the component

The current `defineModel`-per-field approach conflicts with vee-validate ownership. Restructure so `FilmCreateDialog` owns the form state internally, and `useFilmCreateForm` slims down to only the non-form concerns.

### 4a. Slim down `useFilmCreateForm.ts`

Remove from return: `createForm`, `formatOptions`, `emulsionOptions`, `packageTypeOptions`, `isEmulsionDisabled`, `isPackageDisabled` (all move into the component).

Keep: `isCreateDialogOpen`, `isCreating`, `lockedFormatFilters`, `isFormatLocked`, `openCreateDialog`.

Add: `handleCreate(data: FilmCreateFormData): Promise<void>` — transforms `expirationDate` (YYYY-MM-DD → ISO datetime if present) and calls `filmStore.createFilm(payload, idempotencyKey.value)`.

```ts
async function handleCreate(data: FilmCreateFormData): Promise<void> {
  isCreating.value = true;
  try {
    const payload: FilmCreateRequest = {
      name: data.name,
      emulsionId: data.emulsionId,
      filmFormatId: data.filmFormatId,
      packageTypeId: data.packageTypeId,
      expirationDate: data.expirationDate
        ? new Date(`${data.expirationDate}T00:00:00.000Z`).toISOString()
        : null,
    };
    await filmStore.createFilm(payload, idempotencyKey.value);
    feedback.success('Film created.');
    isCreateDialogOpen.value = false;
    idempotencyKey.value = createIdempotencyKey();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to create film.'));
  } finally {
    isCreating.value = false;
  }
}
```

### 4b. Rewrite `FilmCreateDialog.vue`

Props simplified — no more `defineModel` per field:
```ts
interface Props {
  modelValue: boolean;
  isFormatLocked: boolean;
  lockedFormatFilters: string[];
  isCreating: boolean;
}
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [FilmCreateFormData] }>();
```

Internally:
- `const form = reactive({ name: '', filmFormatId: null as number | null, ... })`
- `const { r$ } = useRegleSchema(form, filmCreateFormSchema)`
- `useReferenceStore()` for format/emulsion/package options (watch filmFormatId to reset dependent fields)
- Pre-fill `filmFormatId` when `isFormatLocked` on dialog open (watch `modelValue` → true)
- On submit: `const { valid, data } = await r$.$validate(); if (valid) emit('submit', data)`
- Field bindings: `v-model="r$.$value.name"` `:error="r$.name.$error"` `:error-message="r$.name.$errors[0]"`

### 4c. Update all film pages (index.vue, 35mm.vue, medium-format.vue, large-format.vue, instant.vue)

Remove all `v-model:name`, `v-model:emulsion-id`, etc. bindings. Simplify to:
```vue
<FilmCreateDialog
  v-model="isCreateDialogOpen"
  :is-format-locked="isFormatLocked"
  :locked-format-filters="lockedFormatFilters"
  :is-creating="isCreating"
  @submit="handleCreate"
/>
```
Also update composable destructure to remove the fields that are gone.

Files changed: `apps/ui/src/composables/useFilmCreateForm.ts`, `apps/ui/src/components/FilmCreateDialog.vue`, all five film pages

---

## Step 5 — CreateDeviceDialog: regle with discriminated union

Replace the three separate manual validation blocks in `submit()` with a single `useRegleSchema`:

```ts
const form = reactive({
  deviceTypeCode: 'camera' as const,
  deviceTypeId: null as number | null,
  filmFormatId: null as number | null,
  // ... all other fields
});
const { r$ } = useRegleSchema(form, createFilmDeviceRequestSchema);
```

Key details:
- `deviceTypeId` is not user-entered — resolve it from the reference store and set `r$.$value.deviceTypeId = deviceType.id` in a `watch(() => form.deviceTypeCode, ...)`. This fires immediately so `deviceTypeId` is always populated before submit.
- Bind fields: `v-model="r$.$value.fieldName"` `:error="r$.fieldName.$error"` `:error-message="r$.fieldName.$errors[0]"`
- `frameSizeOptions` watch can stay as-is (resets frameSize when format changes)
- Submit: `const { valid, data } = await r$.$validate(); if (valid) { /* create device */ }`

Files changed: `apps/ui/src/components/CreateDeviceDialog.vue`

---

## Step 6 — Film event form ([id].vue)

Replace the 12 individual refs + `buildEventData()` + `addEvent()` with regle driven by a dynamic schema.

Key changes:
- `const eventForm = reactive({ occurredAt: '', notes: '', storageLocationId: null, ... })` — all possible fields
- `const activeSchema = computed(() => filmEventFormSchemas[selectedStateCode.value ?? 'purchased'])`
- `const { r$ } = useRegleSchema(eventForm, activeSchema)` — regle supports computed schemas natively
- Bind all visible fields: `v-model="r$.$value.occurredAt"` `:error="r$.occurredAt.$error"` etc.
- `occurredAt` normalization: `const occurredAtIso = computed(() => r$.$value.occurredAt ? `${r$.$value.occurredAt}:00.000Z` : '')`
- `buildEventData()` is replaced by `await r$.$validate()` returning typed `data`
- Reset form fields when `selectedStateCode` changes: directly mutate `eventForm` or reassign `r$.$value` properties

**Important:** For conditional fields that only appear for certain states, check `r$.fieldName?.$error` (optional chaining) since regle only validates fields present in the active schema.

Files changed: `apps/ui/src/pages/film/[id].vue`

---

## Critical files

| File | Action |
|---|---|
| `apps/ui/package.json` | Add @regle/schemas |
| `packages/schema/src/film.ts` | Add filmCreateFormSchema + 9 event form schemas + map |
| `apps/ui/src/composables/useZodForm.ts` | **Delete** |
| `apps/ui/src/pages/auth/login.vue` | Replace useZodForm → useRegleSchema |
| `apps/ui/src/pages/auth/register.vue` | Replace useZodForm → useRegleSchema |
| `apps/ui/src/composables/useFilmCreateForm.ts` | Slim down; add handleCreate |
| `apps/ui/src/components/FilmCreateDialog.vue` | Own useRegleSchema form internally |
| `apps/ui/src/pages/film/index.vue` (+ 35mm, medium-format, large-format, instant) | Simplify FilmCreateDialog usage |
| `apps/ui/src/components/CreateDeviceDialog.vue` | useRegleSchema + discriminated union |
| `apps/ui/src/pages/film/[id].vue` | useRegleSchema + computed schema per state |

---

## Verification

1. `pnpm --filter @frollz2/ui lint` — zero warnings
2. `pnpm --filter @frollz2/ui check-types` — no type errors
3. `pnpm test` — vitest suite passes
4. Manual smoke test:
   - Login: submit empty form → `r$.email.$error` and `r$.password.$error` are true, error messages display
   - Register: per-field errors display inline as Quasar `:error-message`
   - Film create dialog: submit without required fields → inline errors via `r$.name.$errors[0]`, etc.
   - Device create dialog: discriminated union validation works; field errors display
   - Film event form: computed schema switches when `selectedStateCode` changes; state-specific required fields (e.g., stored without `storageLocationId`, loaded without `deviceId`) show errors

---

## Regle API Quick Reference

### Setup Pattern
```ts
import { reactive, computed } from 'vue';
import { useRegleSchema, inferSchema } from '@regle/schemas';
import { myZodSchema } from '@frollz2/schema';

// Static schema
const form = reactive({ email: '', password: '' });
const { r$ } = useRegleSchema(form, myZodSchema);

// Computed/dynamic schema (for film event form)
// inferSchema provides TypeScript autocomplete for the schema
const activeSchema = computed(() => 
  inferSchema(form, schemas[selectedState.value])
);
const { r$ } = useRegleSchema(form, activeSchema);
```

### Template Bindings (Quasar)
```vue
<q-input
  v-model="r$.$value.email"
  :error="r$.email.$error"
  :error-message="r$.email.$errors[0]"
  label="Email"
/>

<!-- For optional/conditional fields (check existence first) -->
<q-select
  v-if="showField"
  v-model="r$.$value.storageLocationId"
  :error="r$.storageLocationId?.$error"
  :error-message="r$.storageLocationId?.$errors[0]"
  :options="locations"
/>
```

### Form Submission
```ts
async function submit() {
  const { valid, data } = await r$.$validate();
  if (!valid) return;
  
  // data is fully typed from Zod schema
  await api.post('/endpoint', data);
}
```

### Key Properties
- **`r$.$value.fieldName`** — reactive field value (two-way bindable)
- **`r$.fieldName.$error`** — boolean, true if field has validation errors
- **`r$.fieldName.$errors`** — string array of error messages
- **`r$.$errors`** — all errors across the entire form
- **`r$.$validate()`** — async; returns `{ valid: boolean, data: T }` where T is the Zod output type

### Dynamic Schema Pattern (Film Event Form)
```ts
import { inferSchema } from '@regle/schemas';

const eventForm = reactive({
  occurredAt: '',
  notes: '',
  storageLocationId: null,
  deviceId: null,
  // ... all possible fields
});

const activeSchema = computed(() => {
  // inferSchema preserves TypeScript autocomplete
  return inferSchema(eventForm, filmEventFormSchemas[selectedStateCode.value ?? 'purchased']);
});

const { r$ } = useRegleSchema(eventForm, activeSchema);

// Schema switches reactively when selectedStateCode changes
// Only fields in the active schema are validated
```

### Resetting Forms
```ts
// Option 1: Reassign values directly
Object.assign(eventForm, {
  occurredAt: '',
  notes: '',
  storageLocationId: null,
  // ...
});

// Option 2: Mutate r$.$value
r$.$value.occurredAt = '';
r$.$value.notes = '';
```

### Resources
- [Regle docs](https://regle.dev)
- [Standard Schema spec](https://standardschema.dev)
- [Zod integration guide](https://regle.dev/integrations/schemas-libraries)
