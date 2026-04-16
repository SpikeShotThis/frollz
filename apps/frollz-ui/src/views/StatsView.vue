<template>
  <div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
      Statistics
    </h1>

    <!-- #145 — Film count by transition state -->
    <section aria-labelledby="by-state-heading" class="mb-10">
      <h2
        id="by-state-heading"
        class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4"
      >
        Films by State
      </h2>

      <div
        :aria-busy="loadingStates"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
      >
        <template v-if="loadingStates">
          <div
            v-for="n in 5"
            :key="n"
            class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md animate-pulse"
          >
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
            <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </template>
        <template v-else>
          <div
            v-for="item in stateCounts"
            :key="item.state"
            class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md"
          >
            <p
              class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 truncate"
              :title="item.state"
            >
              {{ item.state }}
            </p>
            <p
              class="text-3xl font-bold text-primary-600 dark:text-primary-400"
            >
              {{ item.count }}
            </p>
          </div>
        </template>
      </div>
      <p
        v-if="stateError"
        role="alert"
        class="mt-2 text-sm text-red-600 dark:text-red-400"
      >
        Could not load state data.
      </p>
    </section>

    <!-- #146 — Films per month trend chart -->
    <section aria-labelledby="by-month-heading" class="mb-10">
      <h2
        id="by-month-heading"
        class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4"
      >
        Films per Month
        <span class="text-sm font-normal text-gray-500 dark:text-gray-400"
          >(last 12 months)</span
        >
      </h2>

      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        :aria-busy="loadingMonths"
      >
        <template v-if="loadingMonths">
          <div
            class="h-40 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"
          />
        </template>
        <p
          v-else-if="monthError"
          role="alert"
          class="text-sm text-red-600 dark:text-red-400"
        >
          Could not load monthly data.
        </p>
        <p
          v-else-if="monthCounts.length === 0"
          class="text-center text-gray-500 dark:text-gray-400 py-10"
        >
          No film data for the past 12 months.
        </p>
        <template v-else>
          <!-- SVG bar chart -->
          <svg
            :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
            class="w-full"
            role="img"
            :aria-label="`Bar chart showing films per month. ${monthChartAriaLabel}`"
          >
            <!-- Bars -->
            <g v-for="(bar, i) in monthBars" :key="bar.label">
              <rect
                :x="bar.x"
                :y="bar.y"
                :width="bar.width"
                :height="bar.barHeight"
                class="fill-primary-500 dark:fill-primary-400"
                rx="2"
              />
              <!-- Count label above bar (only if there's room) -->
              <text
                v-if="bar.barHeight > 14"
                :x="bar.x + bar.width / 2"
                :y="bar.y - 4"
                text-anchor="middle"
                class="fill-gray-600 dark:fill-gray-300"
                font-size="10"
              >
                {{ bar.count }}
              </text>
              <!-- Month label below axis -->
              <text
                :x="bar.x + bar.width / 2"
                :y="svgHeight - 2"
                text-anchor="middle"
                class="fill-gray-500 dark:fill-gray-400"
                font-size="9"
              >
                {{ formatMonthLabel(bar.label, i, monthBars.length) }}
              </text>
            </g>
            <!-- Baseline -->
            <line
              x1="0"
              :y1="svgHeight - 18"
              :x2="svgWidth"
              :y2="svgHeight - 18"
              stroke="currentColor"
              stroke-width="1"
              class="text-gray-200 dark:text-gray-600"
            />
          </svg>
        </template>
      </div>
    </section>

    <!-- #147 — Emulsion usage breakdown -->
    <section aria-labelledby="by-emulsion-heading" class="mb-10">
      <h2
        id="by-emulsion-heading"
        class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4"
      >
        Films by Emulsion
      </h2>

      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        :aria-busy="loadingEmulsions"
      >
        <template v-if="loadingEmulsions">
          <div
            v-for="n in 4"
            :key="n"
            class="h-6 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-3"
          />
        </template>
        <p
          v-else-if="emulsionError"
          role="alert"
          class="text-sm text-red-600 dark:text-red-400"
        >
          Could not load emulsion data.
        </p>
        <p
          v-else-if="emulsionCounts.length === 0"
          class="text-center text-gray-500 dark:text-gray-400 py-6"
        >
          No emulsion data available.
        </p>
        <ul v-else class="space-y-3" aria-label="Emulsion usage breakdown">
          <li
            v-for="item in emulsionCounts"
            :key="item.emulsionName"
            class="flex flex-col gap-1"
          >
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700 dark:text-gray-300">{{
                item.emulsionName
              }}</span>
              <span class="text-gray-500 dark:text-gray-400"
                >{{ item.count }} film{{ item.count === 1 ? "" : "s" }}</span
              >
            </div>
            <div
              class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2"
              role="presentation"
            >
              <div
                class="bg-primary-500 dark:bg-primary-400 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${(item.count / emulsionMax) * 100}%` }"
                :aria-label="`${item.emulsionName}: ${item.count} films`"
              />
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- #148 — Average lifecycle duration per state transition -->
    <section aria-labelledby="lifecycle-heading" class="mb-10">
      <h2
        id="lifecycle-heading"
        class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4"
      >
        Average Lifecycle Duration
      </h2>

      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
        :aria-busy="loadingDurations"
      >
        <template v-if="loadingDurations">
          <div class="p-6 space-y-3">
            <div
              v-for="n in 4"
              :key="n"
              class="h-6 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"
            />
          </div>
        </template>
        <p
          v-else-if="durationError"
          role="alert"
          class="p-6 text-sm text-red-600 dark:text-red-400"
        >
          Could not load lifecycle data.
        </p>
        <p
          v-else-if="transitionDurations.length === 0"
          class="p-6 text-center text-gray-500 dark:text-gray-400"
        >
          No completed transitions recorded yet.
        </p>
        <table v-else class="w-full text-sm text-left">
          <caption class="sr-only">
            Average days between consecutive film state transitions
          </caption>
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-700">
              <th
                scope="col"
                class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300"
              >
                Transition
              </th>
              <th
                scope="col"
                class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right"
              >
                Avg. Days
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in transitionDurations"
              :key="item.transition"
              class="border-b border-gray-50 dark:border-gray-700/50 last:border-b-0"
            >
              <td class="px-6 py-3 text-gray-800 dark:text-gray-200">
                {{ item.transition }}
              </td>
              <td class="px-6 py-3 text-right font-mono">
                <span
                  v-if="item.avgDays !== null"
                  class="text-gray-800 dark:text-gray-200"
                >
                  {{ item.avgDays.toFixed(1) }}
                </span>
                <span v-else class="text-gray-400 dark:text-gray-500">N/A</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { filmStatsApi } from "@/services/api-client";
import type {
  StateCount,
  MonthCount,
  EmulsionCount,
  TransitionDuration,
} from "@/types";

// --- State counts (#145) ---
const loadingStates = ref(true);
const stateError = ref(false);
const stateCounts = ref<StateCount[]>([]);

// --- Monthly counts (#146) ---
const loadingMonths = ref(true);
const monthError = ref(false);
const monthCounts = ref<MonthCount[]>([]);

// --- Emulsion counts (#147) ---
const loadingEmulsions = ref(true);
const emulsionError = ref(false);
const emulsionCounts = ref<EmulsionCount[]>([]);

// --- Lifecycle durations (#148) ---
const loadingDurations = ref(true);
const durationError = ref(false);
const transitionDurations = ref<TransitionDuration[]>([]);

// --- Month SVG chart ---
const svgWidth = 600;
const svgHeight = 180;
const barPadding = 4;
const axisHeight = 18;
const topPadding = 20;

const monthBars = computed(() => {
  if (monthCounts.value.length === 0) return [];
  const max = Math.max(...monthCounts.value.map((m) => m.count), 1);
  const chartHeight = svgHeight - axisHeight - topPadding;
  const totalBars = monthCounts.value.length;
  const barWidth = (svgWidth - barPadding * (totalBars + 1)) / totalBars;

  return monthCounts.value.map((m, i) => {
    const barHeight = Math.max((m.count / max) * chartHeight, 1);
    const x = barPadding + i * (barWidth + barPadding);
    const y = topPadding + chartHeight - barHeight;
    return { label: m.month, count: m.count, x, y, width: barWidth, barHeight };
  });
});

const monthChartAriaLabel = computed(() =>
  monthBars.value.map((b) => `${b.label}: ${b.count}`).join(", "),
);

function formatMonthLabel(ym: string, index: number, total: number): string {
  // Always show first, last, and every 3rd label to avoid crowding
  if (index !== 0 && index !== total - 1 && index % 3 !== 0) return "";
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

// --- Emulsion chart ---
const emulsionMax = computed(() =>
  emulsionCounts.value.length
    ? Math.max(...emulsionCounts.value.map((e) => e.count))
    : 1,
);

// --- Data loading ---
async function loadAll() {
  const results = await Promise.allSettled([
    filmStatsApi.byState(),
    filmStatsApi.byMonth(12),
    filmStatsApi.byEmulsion(),
    filmStatsApi.lifecycleDurations(),
  ]);

  const [stateRes, monthRes, emulsionRes, durationRes] = results;

  if (stateRes.status === "fulfilled") {
    stateCounts.value = stateRes.value.data;
  } else {
    stateError.value = true;
  }
  loadingStates.value = false;

  if (monthRes.status === "fulfilled") {
    monthCounts.value = monthRes.value.data;
  } else {
    monthError.value = true;
  }
  loadingMonths.value = false;

  if (emulsionRes.status === "fulfilled") {
    emulsionCounts.value = emulsionRes.value.data;
  } else {
    emulsionError.value = true;
  }
  loadingEmulsions.value = false;

  if (durationRes.status === "fulfilled") {
    transitionDurations.value = durationRes.value.data;
  } else {
    durationError.value = true;
  }
  loadingDurations.value = false;
}

onMounted(loadAll);
</script>
