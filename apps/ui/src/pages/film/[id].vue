<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { FilmFrame } from '@frollz2/schema';
import { useFilmStore } from '../../stores/film.js';
import { useReferenceStore } from '../../stores/reference.js';
import { useDeviceStore } from '../../stores/devices.js';
import FilmEventForm from '../../components/FilmEventForm.vue';
import FrameMetadataEditor from '../../components/FrameMetadataEditor.vue';
import { filmTransitionMap } from '@frollz2/schema';
import { useFilmCostFormatting } from '../../composables/useFilmCostFormatting.js';
import { formatShutterSpeed } from '../../utils/shutterSpeed.js';

const route = useRoute();
const filmStore = useFilmStore();
const referenceStore = useReferenceStore();
const deviceStore = useDeviceStore();

const filmId = computed(() => Number(route.params.id));
const expandedFrameIds = ref(new Set<number>());
const isFrameEditable = computed(() => filmStore.currentFilm?.currentStateCode === 'loaded');

const frameColumns = [
  { name: 'frameNumber', label: '#', field: 'frameNumber', sortable: true, align: 'left' as const },
  { name: 'state', label: 'State', field: (row: FilmFrame) => row.currentStateCode, align: 'left' as const },
  { name: 'aperture', label: 'Aperture', field: (row: FilmFrame) => row.aperture !== null ? `f/${row.aperture}` : '—', align: 'left' as const },
  { name: 'shutter', label: 'Shutter', field: (row: FilmFrame) => row.shutterSpeedSeconds !== null ? formatShutterSpeed(row.shutterSpeedSeconds) : '—', align: 'left' as const },
  { name: 'filter', label: 'Filter', field: (row: FilmFrame) => row.filterUsed === true ? 'Yes' : row.filterUsed === false ? 'No' : '—', align: 'left' as const }
];

function toggleFrame(id: number): void {
  expandedFrameIds.value.has(id)
    ? expandedFrameIds.value.delete(id)
    : expandedFrameIds.value.add(id);
}

const { formatCost, formatKnownCost } = useFilmCostFormatting();

async function load(): Promise<void> {
  if (!Number.isFinite(filmId.value)) {
    return;
  }

  await Promise.allSettled([referenceStore.loadAll(), filmStore.loadFilm(filmId.value), deviceStore.loadDevices()]);
}

async function handleEventAdded(): Promise<void> {
  await filmStore.loadFilm(filmId.value);
}

onMounted(load);
watch(filmId, load);
</script>

<template>
  <q-page class="q-pa-md column">
    <q-btn flat color="primary" icon="arrow_back" label="Back to film" to="/film" class="self-start" />

    <q-banner v-if="filmStore.detailError" class="bg-red-1 text-negative" rounded>
      {{ filmStore.detailError }}
    </q-banner>
    <div class="row q-gutter-sm">
      <div class="col-8">

        <q-card v-if="filmStore.currentFilm" flat bordered q-pad-md q-gutter-sm>
          <q-card-section>
            <div class="text-h5">{{ filmStore.currentFilm.name }}</div>
            <div class="text-subtitle2 text-grey-7">
              {{ filmStore.currentFilm.emulsion.manufacturer }} {{ filmStore.currentFilm.emulsion.brand }} ·
              {{ filmStore.currentFilm.filmFormat.label }}
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section class="row q-col-gutter-md">
            <div class="col-12 col-md-6"><span class="text-grey-7">Current state:</span> {{
              filmStore.currentFilm.currentState.label }}</div>
            <div class="col-12 col-md-6">
              <span class="text-grey-7">Expiration:</span>
              {{ filmStore.currentFilm.expirationDate ? new
                Date(filmStore.currentFilm.expirationDate).toLocaleDateString()
                : 'N/A' }}
            </div>
            <div class="col-12 col-md-6"><span class="text-grey-7">Purchase cost:</span> {{
              formatCost(filmStore.currentFilm.purchaseCostAllocated) }}</div>
            <div class="col-12 col-md-6"><span class="text-grey-7">Development cost:</span> {{
              formatCost(filmStore.currentFilm.developmentCost) }}</div>
            <div class="col-12 col-md-6"><span class="text-grey-7">Known total cost:</span> {{
              formatKnownCost(filmStore.currentFilm!) }}</div>
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section class="text-subtitle1">Frames</q-card-section>
          <q-separator />
          <q-card-section class="q-pa-none">
            <q-table :rows="filmStore.currentFrames" :columns="frameColumns" row-key="id" flat bordered
              :loading="filmStore.isDetailLoading">
              <template #body="tProps">
                <q-tr :props="tProps" class="cursor-pointer" @click="toggleFrame(tProps.row.id)">
                  <q-td v-for="col in tProps.cols" :key="col.name" :props="tProps">
                    {{ col.value }}
                  </q-td>
                </q-tr>
                <q-tr v-if="expandedFrameIds.has(tProps.row.id)" :props="tProps">
                  <q-td colspan="100%" class="q-pa-none">
                    <FrameMetadataEditor :frame="tProps.row" :film-id="filmId" :readonly="!isFrameEditable" />
                  </q-td>
                </q-tr>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-3">
        <q-card v-if="filmStore.currentFilm" flat bordered>
          <q-card-section>
            <div class="text-subtitle1">Add transition event</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <FilmEventForm :current-state-code="filmStore.currentFilm.currentStateCode"
              :film-format-id="filmStore.currentFilm.filmFormatId" @event-added="handleEventAdded" />
          </q-card-section>
        </q-card>


        <q-timeline layout="dense" side="left" color="secondary">
          <q-timeline-entry heading tag="h5">Journey events</q-timeline-entry>
          <q-timeline-entry v-for="event in filmStore.currentEvents" :key="event.id" tag="h6">
            <template #title> {{referenceStore.filmStates.find((s) => s.code === event.filmStateCode)?.label}}
            </template>
            <template #subtitle>{{ new Date(event.occurredAt).toLocaleString() }}</template>
          </q-timeline-entry>
        </q-timeline>
      </div>
    </div>


  </q-page>
</template>
