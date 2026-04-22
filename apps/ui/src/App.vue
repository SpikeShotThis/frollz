<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { NConfigProvider, NMessageProvider, darkTheme } from 'naive-ui';
import { useAuthStore } from './stores/auth.js';
import { themeOverrides } from './theme.js';

const authStore = useAuthStore();

onMounted(async () => {
  await authStore.restoreSession();
});
</script>

<template>
  <NConfigProvider :theme="darkTheme" :theme-overrides="themeOverrides" :ripple="true">
    <NMessageProvider>
      <RouterView />
    </NMessageProvider>
  </NConfigProvider>
</template>
