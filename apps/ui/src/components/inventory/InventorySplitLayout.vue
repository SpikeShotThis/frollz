<script setup lang="ts">
defineProps<{
  leftPanelTitle: string;
  rightPanelTitle: string;
}>();
</script>

<template>
  <div class="inventory-split">
    <section class="inventory-split__left">
      <slot name="left-header">
        <h2 class="inventory-split__title">{{ leftPanelTitle }}</h2>
      </slot>
      <div class="inventory-split__scroll-body">
        <slot name="left" />
      </div>
    </section>

    <section class="inventory-split__right">
      <slot name="right-header">
        <h2 class="inventory-split__title">{{ rightPanelTitle }}</h2>
      </slot>
      <div class="inventory-split__stats-body">
        <slot name="right" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.inventory-split {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.9fr) minmax(280px, 1fr);
}

.inventory-split__left,
.inventory-split__right {
  align-content: start;
  display: grid;
  gap: 10px;
  min-width: 0;
}

.inventory-split__title {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  margin: 0;
}

.inventory-split__scroll-body {
  max-height: 540px;
  min-height: 420px;
  overflow-y: auto;
  padding-right: 6px;
}

.inventory-split__stats-body {
  display: grid;
  gap: 12px;
}

@media (max-width: 980px) {
  .inventory-split {
    grid-template-columns: minmax(0, 1fr);
  }

  .inventory-split__scroll-body {
    max-height: 420px;
    min-height: 280px;
    padding-right: 0;
  }
}
</style>
