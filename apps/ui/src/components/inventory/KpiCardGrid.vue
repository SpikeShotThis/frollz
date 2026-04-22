<script setup lang="ts">
import { NCard, NFlex, NText } from 'naive-ui';

type KpiCard = {
  label: string;
  value: string | number;
  helper: string;
};

defineProps<{
  cards: KpiCard[];
}>();
</script>

<template>
  <NCard v-for="card in cards" :key="card.label" size="small">
    <NFlex vertical size="small">
      <NText depth="3">{{ card.label }}</NText>
      <NText style="font-size: 1.45rem; font-weight: 700;">{{ card.value }}</NText>
      <NText depth="3">{{ card.helper }}</NText>
    </NFlex>
  </NCard>
</template>
