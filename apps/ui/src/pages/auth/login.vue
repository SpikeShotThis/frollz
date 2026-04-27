<!-- eslint-disable vue/multi-word-component-names -->

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRegleSchema } from '@regle/schemas';
import { loginRequestSchema } from '@frollz2/schema';
import { useAuthStore } from '../../stores/auth.js';
import { useUiFeedback } from '../../composables/useUiFeedback.js';

const authStore = useAuthStore();
const router = useRouter();
const feedback = useUiFeedback();

const form = reactive({ email: '', password: '' });
const { r$ } = useRegleSchema(form, loginRequestSchema);
const isSubmitting = ref(false);
const formError = ref<string | null>(null);

async function submit(): Promise<void> {
  if (isSubmitting.value) {
    return;
  }

  const { valid, data } = await r$.$validate();
  if (!valid) {
    formError.value = 'Please fix the errors above.';
    return;
  }

  isSubmitting.value = true;
  formError.value = null;

  try {
    await authStore.login(data);
    feedback.success('Welcome back.');
    await router.push('/dashboard');
  } catch (error) {
    formError.value = feedback.toErrorMessage(error, 'Unable to log in right now.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <q-page class="row justify-center items-center q-pa-md">
    <q-card flat bordered class="col-xs-12 col-sm-8 col-md-6 col-lg-4">
      <q-card-section>
        <div class="text-h5">Welcome back</div>
        <div class="text-subtitle2 auth-subtitle">Sign in to continue managing your film workflow.</div>
      </q-card-section>

      <q-card-section>
        <q-banner v-if="formError" inline-actions rounded class="bg-red-1 text-negative q-mb-md">{{ formError
        }}</q-banner>

        <q-form class="column q-gutter-md" @submit="submit">
          <q-input
            v-model="r$.$value.email"
            label="Email"
            type="email"
            autocomplete="email"
            data-testid="login-email"
            :disable="isSubmitting"
            :error="r$.email.$error"
            :error-message="r$.email.$errors[0]"
            filled
          />
          <q-input
            v-model="r$.$value.password"
            label="Password"
            type="password"
            autocomplete="current-password"
            data-testid="login-password"
            :disable="isSubmitting"
            :error="r$.password.$error"
            :error-message="r$.password.$errors[0]"
            filled
          />
          <div class="row items-center justify-between q-gutter-sm">
            <q-btn type="submit" color="primary" label="Sign in" :loading="isSubmitting" :disable="isSubmitting"
              data-testid="login-submit" />
            <q-btn flat color="primary" class="auth-secondary-action" label="Create account" :disable="isSubmitting"
              to="/register" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>
