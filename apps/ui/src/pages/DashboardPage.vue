<script setup lang="ts">
import { useRouter } from 'vue-router';
import { NButton, NCard, NGrid, NGridItem, NIcon, NList, NListItem, NSpace, NText } from 'naive-ui';
import PageShell from '../components/PageShell.vue';
import { EmulsionIcon, FilmIcon, DeviceIcon } from '../components/shell/icons.js';

const router = useRouter();

const quickLinks = [
  {
    title: 'Film Inventory',
    description: 'Track rolls and move them through state transitions.',
    path: '/film',
    icon: FilmIcon,
    actionLabel: 'Open film'
  },
  {
    title: 'Devices',
    description: 'Manage cameras, interchangeable backs, and holders.',
    path: '/devices',
    icon: DeviceIcon,
    actionLabel: 'Open devices'
  },
  {
    title: 'Emulsions',
    description: 'Reference available stock and processing methods.',
    path: '/emulsions',
    icon: EmulsionIcon,
    actionLabel: 'Open emulsions'
  }
] as const;
</script>

<template>
  <PageShell title="Dashboard" subtitle="Quick entry points for your film workflow tasks.">
    <NGrid :cols="1" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
      <NGridItem v-for="link in quickLinks" :key="link.path" span="1 m:1 l:1">
        <NCard>
          <NSpace vertical>
            <NSpace align="center" :wrap="false" justify="space-between">
              <NSpace align="center" :wrap="false">
                <NIcon size="20">
                  <component :is="link.icon" />
                </NIcon>
                <NText strong>{{ link.title }}</NText>
              </NSpace>
              <NButton secondary type="primary" @click="router.push(link.path)">{{ link.actionLabel }}</NButton>
            </NSpace>
            <NText depth="3">{{ link.description }}</NText>
          </NSpace>
        </NCard>
      </NGridItem>
    </NGrid>

    <NCard>
      <NList>
        <NListItem>
          <NText strong>Admin shell v1</NText>
          <template #suffix>
            <NText depth="3">Active</NText>
          </template>
        </NListItem>
        <NListItem>
          <NText depth="3">This dashboard is intentionally lightweight and links into existing pages.</NText>
        </NListItem>
      </NList>
    </NCard>
  </PageShell>
</template>
