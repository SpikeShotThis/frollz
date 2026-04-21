<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  compact?: boolean;
}>();
</script>

<template>
  <section class="page-shell" :class="{ 'page-shell--compact': compact }">
    <header class="page-shell__header">
      <div>
        <h1 class="page-shell__title">{{ title }}</h1>
        <p v-if="subtitle" class="page-shell__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="page-shell__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="page-shell__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.page-shell {
  margin: 0 auto;
  max-width: 1100px;
  padding: 20px 16px 40px;
}

.page-shell--compact {
  max-width: 560px;
}

.page-shell__header {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-shell__title {
  font-size: 1.375rem;
  line-height: 1.25;
  margin: 0;
}

.page-shell__subtitle {
  color: #526070;
  margin: 6px 0 0;
}

.page-shell__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.page-shell__body {
  display: grid;
  gap: 16px;
}

@media (max-width: 768px) {
  .page-shell {
    padding: 16px 12px 28px;
  }

  .page-shell__header {
    flex-direction: column;
    margin-bottom: 12px;
  }

  .page-shell__actions {
    position: sticky;
    top: 0;
    z-index: 3;
    width: 100%;
  }
}
</style>
