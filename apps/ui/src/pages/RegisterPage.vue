<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NSpace, NText } from 'naive-ui';
import { useAuthStore } from '../stores/auth.js';
import { useZodForm } from '../composables/useZodForm.js';
import { registerRequestSchema } from '@frollz2/schema';
import PageShell from '../components/PageShell.vue';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import type { FormState } from '../composables/ui-state.js';

const authStore = useAuthStore();
const router = useRouter();
const feedback = useUiFeedback();
const { values, errors, validate } = useZodForm(registerRequestSchema, { email: '', password: '', name: '' });
const isSubmitting = ref(false);
const state = ref<FormState>({
  loading: false,
  fieldErrors: {},
  formError: null
});

function resolveFieldErrors(messages: string[]): Record<string, string> {
  const nextErrors: Record<string, string> = {};
  for (const message of messages) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('name') && !nextErrors.name) {
      nextErrors.name = message;
    } else if (lowerMessage.includes('email') && !nextErrors.email) {
      nextErrors.email = message;
    } else if (lowerMessage.includes('password') && !nextErrors.password) {
      nextErrors.password = message;
    }
  }
  return nextErrors;
}

async function submit(): Promise<void> {
  if (isSubmitting.value) {
    return;
  }

  const parsed = validate();
  state.value.fieldErrors = resolveFieldErrors(errors.value);

  if (!parsed) {
    state.value.formError = 'Please fix the highlighted fields and try again.';
    return;
  }

  isSubmitting.value = true;
  state.value.loading = true;
  state.value.formError = null;
  try {
    await authStore.register(parsed);
    feedback.success('Account created successfully.');
    await router.push('/dashboard');
  } catch (error) {
    state.value.formError = feedback.toErrorMessage(error, 'Unable to register right now.');
  } finally {
    isSubmitting.value = false;
    state.value.loading = false;
  }
}
</script>

<template>
  <PageShell title="Create your account" subtitle="Start organizing film, devices, and journey events." compact>
    <NCard>
      <NSpace vertical>
        <NAlert v-if="state.formError" type="error" :show-icon="true">{{ state.formError }}</NAlert>
        <NForm @submit.prevent="submit">
          <NFormItem label="Name" required :feedback="state.fieldErrors.name || ''" :label-props="{ for: 'register-name-input' }">
            <NInput
              :value="values.name"
              :input-props="{ id: 'register-name-input', name: 'name', autocomplete: 'name' }"
              placeholder="Your name"
              @update:value="(value) => { values.name = value; }"
            />
          </NFormItem>
          <NFormItem label="Email" required :feedback="state.fieldErrors.email || ''" :label-props="{ for: 'register-email-input' }">
            <NInput
              :value="values.email"
              type="text"
              :input-props="{ id: 'register-email-input', name: 'email', autocomplete: 'email' }"
              placeholder="you@example.com"
              @update:value="(value) => { values.email = value; }"
            />
          </NFormItem>
          <NFormItem label="Password" required :feedback="state.fieldErrors.password || ''" :label-props="{ for: 'register-password-input' }">
            <NInput
              :value="values.password"
              type="password"
              show-password-on="click"
              :input-props="{ id: 'register-password-input', name: 'password', autocomplete: 'new-password' }"
              @update:value="(value) => { values.password = value; }"
            />
          </NFormItem>
          <NSpace justify="space-between" align="center">
            <NText depth="3">Already registered?</NText>
            <NSpace>
              <NButton type="primary" attr-type="submit" :loading="isSubmitting" :disabled="isSubmitting">Create account</NButton>
              <NButton tertiary :disabled="isSubmitting" @click="router.push('/login')">Sign in</NButton>
            </NSpace>
          </NSpace>
        </NForm>
        <NText v-for="error in errors" :key="error" type="error">{{ error }}</NText>
      </NSpace>
    </NCard>
  </PageShell>
</template>
