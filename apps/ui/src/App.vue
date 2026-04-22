<script setup lang="ts">
import { RouterView } from 'vue-router';
import { NConfigProvider, NMessageProvider, darkTheme } from 'naive-ui';
import { themeOverrides } from './theme.js';
</script>

<template>
  <NConfigProvider :theme="darkTheme" :theme-overrides="themeOverrides" :ripple="true">
    <NMessageProvider>
      <RouterView />
    </NMessageProvider>
  </NConfigProvider>
</template>
