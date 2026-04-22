<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NSpace, NText } from 'naive-ui';
import { useAuthStore } from '../stores/auth.js';
import { useZodForm } from '../composables/useZodForm.js';
import { loginRequestSchema } from '@frollz2/schema';
import PageShell from '../components/PageShell.vue';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import type { FormState } from '../composables/ui-state.js';

const authStore = useAuthStore();
const router = useRouter();
const feedback = useUiFeedback();
const { values, errors, validate } = useZodForm(loginRequestSchema, { email: '', password: '' });
const isSubmitting = ref(false);

function resolveFieldErrors(messages: string[]): Record<string, string> {
  const nextErrors: Record<string, string> = {};
  for (const message of messages) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('email') && !nextErrors.email) {
      nextErrors.email = message;
    } else if (lowerMessage.includes('password') && !nextErrors.password) {
      nextErrors.password = message;
    }
  }
  return nextErrors;
}

const state = ref<FormState>({
  loading: false,
  fieldErrors: {},
  formError: null
});

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
    await authStore.login(parsed);
    feedback.success('Welcome back.');
    await router.push('/dashboard');
  } catch (error) {
    state.value.formError = feedback.toErrorMessage(error, 'Unable to log in right now.');
  } finally {
    isSubmitting.value = false;
    state.value.loading = false;
  }
}
</script>

<template>
  <PageShell title="Welcome back" subtitle="Sign in to continue tracking your film workflow." compact>
    <NCard>
      <NSpace vertical>
        <NAlert v-if="state.formError" type="error" :show-icon="true">{{ state.formError }}</NAlert>
        <NForm @submit.prevent="submit">
          <NFormItem label="Email" required :feedback="state.fieldErrors.email || ''" :label-props="{ for: 'login-email-input' }">
            <NInput
              :value="values.email"
              type="text"
              :input-props="{ id: 'login-email-input', name: 'email', autocomplete: 'email' }"
              placeholder="you@example.com"
              data-testid="login-email"
              @update:value="(value) => { values.email = value; }"
            />
          </NFormItem>
          <NFormItem label="Password" required :feedback="state.fieldErrors.password || ''" :label-props="{ for: 'login-password-input' }">
            <NInput
              :value="values.password"
              type="password"
              show-password-on="click"
              :input-props="{ id: 'login-password-input', name: 'password', autocomplete: 'current-password' }"
              data-testid="login-password"
              @update:value="(value) => { values.password = value; }"
            />
          </NFormItem>
          <NSpace justify="space-between" align="center">
            <NText depth="3">Need an account?</NText>
            <NSpace>
              <NButton type="primary" attr-type="submit" :loading="isSubmitting" :disabled="isSubmitting" data-testid="login-submit">
                Sign in
              </NButton>
              <NButton tertiary :disabled="isSubmitting" @click="router.push('/register')">Create account</NButton>
            </NSpace>
          </NSpace>
        </NForm>
        <NText v-for="error in errors" :key="error" type="error">{{ error }}</NText>
      </NSpace>
    </NCard>
  </PageShell>
</template>
