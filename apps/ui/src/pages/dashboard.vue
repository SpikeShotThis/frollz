<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useDeviceStore } from '../stores/devices.js';
import { useFilmStore } from '../stores/film.js';
import { useReferenceStore } from '../stores/reference.js';

const filmStore = useFilmStore();
const deviceStore = useDeviceStore();
const referenceStore = useReferenceStore();

onMounted(async () => {
  await Promise.allSettled([referenceStore.loadAll(), filmStore.loadFilms(), deviceStore.loadDevices()]);
});

const cards = [
  {
    title: 'Film Inventory',
    subtitle: 'Track stock and state transitions.',
    to: '/film',
    actionLabel: 'Open film'
  },
  {
    title: 'Devices',
    subtitle: 'Manage cameras, backs, and holders.',
    to: '/devices',
    actionLabel: 'Open devices'
  },
  {
    title: 'Emulsions',
    subtitle: 'Reference emulsions and processing.',
    to: '/emulsions',
    actionLabel: 'Open emulsions'
  }
] as const;
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-grey-7">Films</div>
            <div class="text-h5">{{ filmStore.films.length }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-grey-7">Devices</div>
            <div class="text-h5">{{ deviceStore.devices.length }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-grey-7">Emulsions</div>
            <div class="text-h5">{{ referenceStore.emulsions.length }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div v-for="card in cards" :key="card.to" class="col-12 col-md-4">
        <q-card flat bordered class="full-height">
          <q-card-section>
            <div class="text-h6">{{ card.title }}</div>
            <div class="text-body2 text-grey-7">{{ card.subtitle }}</div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn color="primary" :label="card.actionLabel" :to="card.to" />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
