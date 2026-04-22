<script setup lang="ts">
import { RouterView } from 'vue-router';
import { NLayout, NLayoutContent } from 'naive-ui';
</script>

<template>
  <NLayout class="auth-layout">
    <NLayoutContent>
      <RouterView />
    </NLayoutContent>
  </NLayout>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
}
</style>
