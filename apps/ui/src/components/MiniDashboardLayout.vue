<script setup lang="ts">
defineProps<{
  leftPanelTitle: string;
  rightPanelTitle: string;
}>();
</script>

<template>
  <div class="mini-dashboard">
    <section class="mini-dashboard__left">
      <slot name="left-header">
        <h2 class="mini-dashboard__title">{{ leftPanelTitle }}</h2>
      </slot>
      <div class="mini-dashboard__scroll-body">
        <slot name="left" />
      </div>
    </section>

    <section class="mini-dashboard__right">
      <slot name="right-header">
        <h2 class="mini-dashboard__title">{{ rightPanelTitle }}</h2>
      </slot>
      <div class="mini-dashboard__stats-body">
        <slot name="right" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.mini-dashboard {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.9fr) minmax(280px, 1fr);
}

.mini-dashboard__left,
.mini-dashboard__right {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.mini-dashboard__title {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  margin: 0;
}

.mini-dashboard__scroll-body {
  max-height: 540px;
  min-height: 420px;
  overflow-y: auto;
  padding-right: 6px;
}

.mini-dashboard__stats-body {
  display: grid;
  gap: 12px;
}

@media (max-width: 980px) {
  .mini-dashboard {
    grid-template-columns: minmax(0, 1fr);
  }

  .mini-dashboard__scroll-body {
    max-height: 420px;
    min-height: 280px;
    padding-right: 0;
  }
}
</style>
