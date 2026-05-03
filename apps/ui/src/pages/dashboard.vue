<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { filmDetailSchema, type FilmJourneyEvent, type FilmSummary } from '@frollz2/schema';
import { useDeviceStore } from '../stores/devices.js';
import { useFilmStore } from '../stores/film.js';
import { useReferenceStore } from '../stores/reference.js';
import { useEmulsionStore } from '../stores/emulsions.js';
import { useApi } from '../composables/useApi.js';
import { readApiData } from '../composables/api-envelope.js';

const filmStore = useFilmStore();
const deviceStore = useDeviceStore();
const referenceStore = useReferenceStore();
const emulsionStore = useEmulsionStore();
const { request } = useApi();

const EXPIRING_SOON_DAYS = 90;
const LOADED_IDLE_DAYS = 14;
const RECENT_ACTIVITY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LARGE_FORMAT_CODES = ['4x5', '5x7', '8x10', '11x14'];

const latestEventsByFilmId = ref<Record<number, FilmJourneyEvent | null>>({});

function daysAgoToMs(days: number): number {
  return Date.now() - days * MS_PER_DAY;
}

function eventAgeInDays(event: FilmJourneyEvent | null): number | null {
  if (!event) {
    return null;
  }

  const occurredAt = Date.parse(event.occurredAt);
  if (Number.isNaN(occurredAt)) {
    return null;
  }

  return Math.floor((Date.now() - occurredAt) / MS_PER_DAY);
}

function isWithinDays(isoDate: string | null, days: number): boolean {
  if (!isoDate) {
    return false;
  }

  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const now = Date.now();
  return timestamp >= now && timestamp <= now + days * MS_PER_DAY;
}

function byState(code: string): FilmSummary[] {
  return filmStore.films.filter((film) => film.currentStateCode === code);
}

function countByFormats(formatCodes: string[]): number {
  return filmStore.films.filter((film) => formatCodes.includes(film.filmFormat.code)).length;
}

async function loadLatestEventsForAging(): Promise<void> {
  const films = filmStore.films;
  const settled = await Promise.allSettled(
    films.map(async (film) => {
      const response = await request(`/api/v1/film/${film.id}`);
      const detail = filmDetailSchema.parse(await readApiData(response));
      return [film.id, detail.latestEvent] as const;
    })
  );

  const next: Record<number, FilmJourneyEvent | null> = {};
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      const [filmId, latestEvent] = result.value;
      next[filmId] = latestEvent;
    }
  }

  latestEventsByFilmId.value = next;
}

onMounted(async () => {
  await Promise.allSettled([referenceStore.loadAll(), emulsionStore.loadAll(), filmStore.loadFilms(), deviceStore.loadDevices()]);
  await loadLatestEventsForAging();
});

const totalFilms = computed(() => filmStore.films.length);
const count35mm = computed(() => countByFormats(['35mm']));
const count120 = computed(() => countByFormats(['120']));
const countSheet = computed(() => countByFormats(LARGE_FORMAT_CODES));

const loadedFilms = computed(() => byState('loaded'));
const removedFilms = computed(() => byState('removed'));
const sentForDevFilms = computed(() => byState('sent_for_dev'));
const archivedFilms = computed(() => byState('archived'));
const expiringSoonFilms = computed(() => filmStore.films.filter((film) => isWithinDays(film.expirationDate, EXPIRING_SOON_DAYS)));

const loadedIdleCount = computed(() =>
  loadedFilms.value.filter((film) => {
    const age = eventAgeInDays(latestEventsByFilmId.value[film.id] ?? null);
    return age !== null && age > LOADED_IDLE_DAYS;
  }).length
);

const removedOldestDays = computed(() =>
  Math.max(
    0,
    ...removedFilms.value
      .map((film) => eventAgeInDays(latestEventsByFilmId.value[film.id] ?? null))
      .filter((value): value is number => value !== null)
  )
);

const sentForDevOldestDays = computed(() =>
  Math.max(
    0,
    ...sentForDevFilms.value
      .map((film) => eventAgeInDays(latestEventsByFilmId.value[film.id] ?? null))
      .filter((value): value is number => value !== null)
  )
);

const recentActivityCount = computed(() => {
  const sinceMs = daysAgoToMs(RECENT_ACTIVITY_DAYS);
  return filmStore.films.filter((film) => {
    const latestEvent = latestEventsByFilmId.value[film.id];
    if (!latestEvent) {
      return false;
    }
    const occurredAt = Date.parse(latestEvent.occurredAt);
    return !Number.isNaN(occurredAt) && occurredAt >= sinceMs;
  }).length;
});

const statCards = computed(() => [
  {
    key: 'total',
    title: 'Total Films',
    value: totalFilms.value,
    helper: 'All tracked rolls and sheets',
    to: '/film',
    actionLabel: 'Open film'
  },
  {
    key: 'format',
    title: 'By Format',
    value: totalFilms.value,
    helper: `35mm ${count35mm.value} · 120 ${count120.value} · Sheet ${countSheet.value}`,
    to: '/film',
    actionLabel: 'Open formats'
  },
  {
    key: 'loaded',
    title: 'Loaded (Idle Risk)',
    value: loadedFilms.value.length,
    helper: `${loadedIdleCount.value} idle > ${LOADED_IDLE_DAYS} days`,
    to: { path: '/film', query: { stateCode: 'loaded' } },
    actionLabel: 'View loaded'
  },
  {
    key: 'removed',
    title: 'Removed (Not Sent)',
    value: removedFilms.value.length,
    helper: `Oldest waiting: ${removedOldestDays.value} days`,
    to: { path: '/film', query: { stateCode: 'removed' } },
    actionLabel: 'View removed'
  },
  {
    key: 'sent-for-dev',
    title: 'Sent for Dev',
    value: sentForDevFilms.value.length,
    helper: `Oldest at lab: ${sentForDevOldestDays.value} days`,
    to: { path: '/film', query: { stateCode: 'sent_for_dev' } },
    actionLabel: 'View lab queue'
  },
  {
    key: 'expiring',
    title: 'Expiring Soon',
    value: expiringSoonFilms.value.length,
    helper: `Expires in next ${EXPIRING_SOON_DAYS} days`,
    to: '/film',
    actionLabel: 'Review stock'
  },
  {
    key: 'archived',
    title: 'Archived',
    value: archivedFilms.value.length,
    helper: 'Completed rolls and sheets',
    to: { path: '/film', query: { stateCode: 'archived' } },
    actionLabel: 'View archived'
  },
  {
    key: 'recent',
    title: `Recent Activity (${RECENT_ACTIVITY_DAYS}d)`,
    value: recentActivityCount.value,
    helper: 'Films with new state changes',
    to: '/film',
    actionLabel: 'Open film'
  }
]);

const formatMeterSegments = computed(() => {
  const total = Math.max(1, totalFilms.value);
  return [
    { key: '35mm', label: '35mm', value: count35mm.value, color: 'primary', icon: 'camera_roll' },
    { key: '120', label: '120', value: count120.value, color: 'teal', icon: 'camera' },
    { key: 'sheet', label: 'Sheet', value: countSheet.value, color: 'orange', icon: 'photo_size_select_large' }
  ].map((segment) => ({
    ...segment,
    ratio: segment.value / total
  }));
});

const workflowMeterSegments = computed(() => {
  const total = Math.max(1, totalFilms.value);
  return [
    { key: 'loaded', label: 'Loaded', value: loadedFilms.value.length, color: 'amber', icon: 'camera_alt' },
    { key: 'removed', label: 'Removed', value: removedFilms.value.length, color: 'deep-orange', icon: 'inventory_2' },
    { key: 'lab', label: 'At Lab', value: sentForDevFilms.value.length, color: 'indigo', icon: 'local_shipping' },
    { key: 'archived', label: 'Archived', value: archivedFilms.value.length, color: 'positive', icon: 'archive' }
  ].map((segment) => ({
    ...segment,
    ratio: segment.value / total
  }));
});

type MeterSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
  icon: string;
  ratio: number;
};

const cardDetailSegments = computed<Record<string, MeterSegment[]>>(() => {
  const total = Math.max(1, totalFilms.value);
  const unloadedCount = Math.max(0, totalFilms.value - loadedFilms.value.length);
  const notExpiredSoonCount = Math.max(0, totalFilms.value - expiringSoonFilms.value.length);
  const notRecentCount = Math.max(0, totalFilms.value - recentActivityCount.value);

  return {
    total: workflowMeterSegments.value,
    format: formatMeterSegments.value,
    loaded: [
      {
        key: 'loaded-idle',
        label: `Idle > ${LOADED_IDLE_DAYS}d`,
        value: loadedIdleCount.value,
        color: 'deep-orange',
        icon: 'hourglass_top',
        ratio: loadedFilms.value.length === 0 ? 0 : loadedIdleCount.value / loadedFilms.value.length
      },
      {
        key: 'loaded-active',
        label: `Active <= ${LOADED_IDLE_DAYS}d`,
        value: Math.max(0, loadedFilms.value.length - loadedIdleCount.value),
        color: 'amber',
        icon: 'flash_on',
        ratio: loadedFilms.value.length === 0 ? 0 : Math.max(0, loadedFilms.value.length - loadedIdleCount.value) / loadedFilms.value.length
      }
    ],
    removed: [
      {
        key: 'removed-total',
        label: 'Awaiting lab',
        value: removedFilms.value.length,
        color: 'deep-orange',
        icon: 'inventory_2',
        ratio: removedFilms.value.length / total
      },
      {
        key: 'removed-other',
        label: 'Other states',
        value: Math.max(0, totalFilms.value - removedFilms.value.length),
        color: 'grey-6',
        icon: 'layers',
        ratio: Math.max(0, totalFilms.value - removedFilms.value.length) / total
      }
    ],
    'sent-for-dev': [
      {
        key: 'dev-at-lab',
        label: 'In lab queue',
        value: sentForDevFilms.value.length,
        color: 'indigo',
        icon: 'local_shipping',
        ratio: sentForDevFilms.value.length / total
      },
      {
        key: 'dev-not-lab',
        label: 'Not in lab',
        value: Math.max(0, totalFilms.value - sentForDevFilms.value.length),
        color: 'grey-6',
        icon: 'inventory',
        ratio: Math.max(0, totalFilms.value - sentForDevFilms.value.length) / total
      }
    ],
    expiring: [
      {
        key: 'expiring-soon',
        label: `Expires <= ${EXPIRING_SOON_DAYS}d`,
        value: expiringSoonFilms.value.length,
        color: 'orange',
        icon: 'event',
        ratio: expiringSoonFilms.value.length / total
      },
      {
        key: 'expiring-later',
        label: 'Stable horizon',
        value: notExpiredSoonCount,
        color: 'grey-6',
        icon: 'event_available',
        ratio: notExpiredSoonCount / total
      }
    ],
    archived: [
      {
        key: 'archived-done',
        label: 'Completed',
        value: archivedFilms.value.length,
        color: 'positive',
        icon: 'archive',
        ratio: archivedFilms.value.length / total
      },
      {
        key: 'archived-open',
        label: 'Still active',
        value: Math.max(0, totalFilms.value - archivedFilms.value.length),
        color: 'grey-6',
        icon: 'pending_actions',
        ratio: Math.max(0, totalFilms.value - archivedFilms.value.length) / total
      }
    ],
    recent: [
      {
        key: 'recent-active',
        label: `Changed <= ${RECENT_ACTIVITY_DAYS}d`,
        value: recentActivityCount.value,
        color: 'teal',
        icon: 'history',
        ratio: recentActivityCount.value / total
      },
      {
        key: 'recent-quiet',
        label: 'No recent change',
        value: notRecentCount,
        color: 'grey-6',
        icon: 'schedule',
        ratio: notRecentCount / total
      }
    ]
  };
});
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <div v-for="card in statCards" :key="card.key" class="col-12 col-sm-6 col-lg-3">
        <q-card flat bordered class="full-height column">
          <q-card-section class="col column">
            <div class="text-subtitle2 text-grey-7">{{ card.title }}</div>
            <div class="text-h5">{{ card.value }}</div>
            <div class="text-body2 text-grey-7">{{ card.helper }}</div>
            <div class="q-mt-md column q-gutter-xs">
              <div
                v-for="segment in cardDetailSegments[card.key] ?? []"
                :key="segment.key"
                class="row items-center no-wrap q-gutter-sm"
              >
                <q-icon :name="segment.icon" size="16px" class="text-grey-7" />
                <div class="col">
                  <div class="row items-center justify-between">
                    <span class="text-caption">{{ segment.label }}</span>
                    <span class="text-caption text-grey-7">{{ segment.value }}</span>
                  </div>
                  <q-linear-progress size="8px" rounded :value="segment.ratio" :color="segment.color" track-color="grey-3" />
                </div>
              </div>
            </div>
          </q-card-section>
          <q-card-actions align="right" class="q-pt-none">
            <q-btn color="primary" rounded unelevated :label="card.actionLabel" :to="card.to" />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
