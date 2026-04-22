<script setup lang="ts">
import { NCard, NDescriptions, NDescriptionsItem, NFlex, NTag, NText } from 'naive-ui';

type DetailItem = {
  label: string;
  value: string;
};

defineProps<{
  title: string;
  subtitle?: string;
  tagLabel?: string;
  tagType?: 'default' | 'info' | 'primary' | 'warning' | 'success' | 'error';
  details: DetailItem[];
}>();
</script>

<template>
  <NCard>
    <NFlex vertical size="small">
      <NFlex justify="space-between" align="center" :wrap="false">
        <NFlex vertical size="small">
          <NText strong>{{ title }}</NText>
          <NText v-if="subtitle" depth="3">{{ subtitle }}</NText>
        </NFlex>
        <NTag v-if="tagLabel" :type="tagType ?? 'default'">{{ tagLabel }}</NTag>
      </NFlex>

      <NDescriptions label-placement="top" :column="3" bordered size="small">
        <NDescriptionsItem v-for="item in details" :key="item.label" :label="item.label">
          {{ item.value }}
        </NDescriptionsItem>
      </NDescriptions>

      <slot name="actions" />
    </NFlex>
  </NCard>
</template>
