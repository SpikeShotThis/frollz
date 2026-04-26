<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { registerRequestSchema } from '@frollz2/schema';
import { useAuthStore } from '../../stores/auth.js';
import { useZodForm } from '../../composables/useZodForm.js';
import { useUiFeedback } from '../../composables/useUiFeedback.js';

const authStore = useAuthStore();
const router = useRouter();
const feedback = useUiFeedback();
const { values, errors, validate } = useZodForm(registerRequestSchema, { email: '', password: '', name: '' });
const isSubmitting = ref(false);
const formError = ref<string | null>(null);

async function submit(): Promise<void> {
  if (isSubmitting.value) {
    return;
  }

  const parsed = validate();
  if (!parsed) {
    formError.value = errors.value.join(' ');
    return;
  }

  isSubmitting.value = true;
  formError.value = null;

  try {
    await authStore.register(parsed);
    feedback.success('Account created.');
    await router.push('/dashboard');
  } catch (error) {
    formError.value = feedback.toErrorMessage(error, 'Unable to register right now.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <q-page class="row justify-center items-center q-pa-md">
    <q-card flat bordered class="col-xs-12 col-sm-8 col-md-6 col-lg-4">
      <q-card-section>
        <div class="text-h5">Create account</div>
        <div class="text-subtitle2 auth-subtitle">Start tracking rolls, devices, and transitions.</div>
      </q-card-section>

      <q-card-section>
        <q-banner v-if="formError" inline-actions rounded class="bg-red-1 text-negative q-mb-md">{{ formError }}</q-banner>

        <q-form class="column q-gutter-md" @submit="submit">
          <q-input v-model="values.name" label="Name" autocomplete="name" :disable="isSubmitting" filled />
          <q-input v-model="values.email" label="Email" type="email" autocomplete="email" :disable="isSubmitting" filled />
          <q-input
            v-model="values.password"
            label="Password"
            type="password"
            autocomplete="new-password"
            :disable="isSubmitting"
            filled
          />

          <div class="row items-center justify-between q-gutter-sm">
            <q-btn type="submit" color="primary" label="Create account" :loading="isSubmitting" :disable="isSubmitting" />
            <q-btn flat color="primary" class="auth-secondary-action" label="Sign in" :disable="isSubmitting" to="/login" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>
