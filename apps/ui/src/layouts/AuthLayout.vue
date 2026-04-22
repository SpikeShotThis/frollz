<script setup lang="ts">
import { RouterView } from 'vue-router';
import { NLayout, NLayoutContent } from 'naive-ui';
</script>

<template>
  <NLayout class="auth-layout">
    <NLayoutContent>
      <main id="auth-main-content" class="auth-layout__main">
        <RouterView />
      </main>
    </NLayoutContent>
  </NLayout>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
}

.auth-layout__main {
  min-height: 100vh;
}
</style>
