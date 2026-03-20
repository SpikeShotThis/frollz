<template>
  <div>
    <div class="mb-6">
      <button
        @click="$router.push({ name: 'rolls' })"
        class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
      >← Back to Rolls</button>
    </div>

    <div v-if="loading" role="status" aria-label="Loading roll detail" class="text-center py-12 text-gray-600 dark:text-gray-400">Loading...</div>

    <div v-else-if="!roll" class="text-center py-12 text-gray-600 dark:text-gray-400">Roll not found.</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left: Details + Tags + Transitions -->
      <div class="space-y-6">
        <!-- Roll header -->
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ roll.rollId }}</h1>
          <span
            class="mt-2 inline-block px-2 text-xs leading-5 font-semibold rounded-full"
            :class="getStateColor(roll.state)"
          >{{ roll.state }}</span>
        </div>

        <!-- Parent bulk roll link (child rolls only) -->
        <div v-if="parentRoll" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Cut from bulk roll
            <button
              @click="router.push({ name: 'roll-detail', params: { key: parentRoll._key } })"
              class="text-primary-600 dark:text-primary-400 hover:underline font-medium ml-1"
            >{{ parentRoll.rollId }}</button>
          </p>
        </div>

        <!-- Details card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Details</h2>
          <dl class="space-y-3">
            <div v-if="roll.stockName" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Stock</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ roll.stockName }}<span v-if="roll.stockSpeed" class="text-gray-500 dark:text-gray-400"> ISO {{ roll.stockSpeed }}</span></dd>
            </div>
            <div v-if="roll.formatName" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Format</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ roll.formatName }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Date Obtained</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ formatDate(roll.dateObtained) }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Obtained From</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ roll.obtainedFrom }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Method</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ roll.obtainmentMethod }}</dd>
            </div>
            <div v-if="roll.expirationDate" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Expiration Date</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ formatDate(roll.expirationDate) }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">X-Ray Exposures</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ roll.timesExposedToXrays }}</dd>
            </div>
            <div v-if="roll.loadedInto" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Loaded Into</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ roll.loadedInto }}</dd>
            </div>
            <div v-if="roll.imagesUrl" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Images</dt>
              <dd><a :href="roll.imagesUrl" target="_blank" class="text-primary-600 dark:text-primary-400 hover:underline text-sm">View Album</a></dd>
            </div>
          </dl>
        </div>

        <!-- Transitions card -->
        <div v-if="validTransitions.length > 0" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Transitions</h2>
          <div class="space-y-3">
            <div class="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              <button
                v-for="targetState in validTransitions"
                :key="targetState"
                @click="handleTransition(targetState)"
                :disabled="transitionSubmitting || !!pendingTransition || !!pendingMetadataTransition"
                class="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-medium border rounded disabled:opacity-50"
                :class="isBackwardTransition(roll.state, targetState)
                  ? 'text-orange-700 border-orange-400 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-500 dark:hover:bg-orange-900/30'
                  : 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:border-primary-700 dark:hover:bg-primary-800'"
              >
                {{ isBackwardTransition(roll.state, targetState) ? '↩ ' : '' }}{{ targetState }}
              </button>
            </div>
            <!-- Storage state metadata form -->
            <div v-if="pendingMetadataTransition" class="border border-blue-300 dark:border-blue-600 rounded-md p-3 bg-blue-50 dark:bg-blue-900/20">
              <p class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">{{ pendingMetadataTransition }} details</p>
              <label v-if="requiresDateCapture(pendingMetadataTransition!)" for="meta-date" class="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                Date <span class="text-red-500" aria-hidden="true">*</span>
                <input id="meta-date" v-model="metadataDate" type="date" required aria-required="true" class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </label>
              <label v-if="pendingMetadataTransition === RollState.FROZEN || pendingMetadataTransition === RollState.REFRIGERATED || pendingMetadataTransition === RollState.SHELVED" for="meta-temperature" class="block text-xs text-gray-600 dark:text-gray-400">
                Storage temperature ({{ temperatureUnit }}) — optional
                <input
                  id="meta-temperature"
                  v-model="metadataTemperature"
                  type="number"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </label>
              <label v-if="pendingMetadataTransition === RollState.FINISHED" for="meta-shot-iso" class="block text-xs text-gray-600 dark:text-gray-400">
                Shot ISO — optional
                <input
                  id="meta-shot-iso"
                  v-model="metadataShotISO"
                  type="number"
                  placeholder="e.g. 400"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </label>
              <div v-if="pendingMetadataTransition === RollState.SENT_FOR_DEVELOPMENT" class="space-y-2">
                <label for="meta-lab-name" class="block text-xs text-gray-600 dark:text-gray-400">
                  Lab name <span class="text-red-500" aria-hidden="true">*</span>
                  <input
                    id="meta-lab-name"
                    v-model="metadataLabName"
                    type="text"
                    required
                    aria-required="true"
                    placeholder="e.g. The Darkroom"
                    class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </label>
                <label for="meta-delivery-method" class="block text-xs text-gray-600 dark:text-gray-400">
                  Delivery method <span class="text-red-500" aria-hidden="true">*</span>
                  <select
                    id="meta-delivery-method"
                    v-model="metadataDeliveryMethod"
                    required
                    aria-required="true"
                    class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select…</option>
                    <option v-for="m in DELIVERY_METHODS" :key="m" :value="m">{{ m }}</option>
                  </select>
                </label>
                <label for="meta-process-requested" class="block text-xs text-gray-600 dark:text-gray-400">
                  Process requested <span class="text-red-500" aria-hidden="true">*</span>
                  <select
                    id="meta-process-requested"
                    v-model="metadataProcessRequested"
                    required
                    aria-required="true"
                    class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select…</option>
                    <option v-for="p in PROCESSES_REQUESTED" :key="p" :value="p">{{ p }}</option>
                  </select>
                </label>
                <label for="meta-push-pull" class="block text-xs text-gray-600 dark:text-gray-400">
                  Push/pull stops — optional
                  <input
                    id="meta-push-pull"
                    v-model="metadataPushPullStops"
                    type="number"
                    placeholder="+2 push, -1 pull"
                    class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </label>
              </div>
              <p v-if="metadataFormError" role="alert" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ metadataFormError }}</p>
              <div v-if="pendingMetadataTransition === RollState.RECEIVED" class="space-y-3">
                <label for="meta-scans-received" class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input id="meta-scans-received" v-model="metadataScansReceived" type="checkbox" class="rounded" />
                  Scans received
                </label>
                <div v-if="metadataScansReceived" class="pl-5 space-y-2">
                  <label for="meta-scans-date" class="block text-xs text-gray-600 dark:text-gray-400">
                    Scans date
                    <input id="meta-scans-date" v-model="metadataScansDate" type="date" class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  </label>
                  <label for="meta-scans-url" class="block text-xs text-gray-600 dark:text-gray-400">
                    Scans URL — optional
                    <input id="meta-scans-url" v-model="metadataScansUrl" type="url" placeholder="https://…" class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  </label>
                </div>
                <label for="meta-negatives-received" class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input id="meta-negatives-received" v-model="metadataNegativesReceived" type="checkbox" class="rounded" />
                  Negatives received
                </label>
                <div v-if="metadataNegativesReceived" class="pl-5">
                  <label for="meta-negatives-date" class="block text-xs text-gray-600 dark:text-gray-400">
                    Negatives date
                    <input id="meta-negatives-date" v-model="metadataNegativesDate" type="date" class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  </label>
                </div>
              </div>
              <div class="flex flex-col sm:flex-row gap-2 mt-3">
                <button
                  @click="submitMetadataTransition"
                  :disabled="transitionSubmitting"
                  class="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-medium bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >Confirm</button>
                <button
                  @click="pendingMetadataTransition = null"
                  :disabled="transitionSubmitting"
                  class="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline disabled:opacity-50"
                >Cancel</button>
              </div>
            </div>
            <!-- Error correction prompt -->
            <div v-if="pendingTransition" class="border border-orange-300 dark:border-orange-600 rounded-md p-3 bg-orange-50 dark:bg-orange-900/20">
              <p class="text-sm text-orange-800 dark:text-orange-200 mb-2">Was this done to correct an error?</p>
              <div class="flex flex-col sm:flex-row gap-2">
                <button
                  @click="confirmTransition(true)"
                  :disabled="transitionSubmitting"
                  class="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-medium bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >Yes</button>
                <button
                  @click="confirmTransition(false)"
                  :disabled="transitionSubmitting"
                  class="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-medium border border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >No</button>
                <button
                  @click="pendingTransition = null"
                  :disabled="transitionSubmitting"
                  class="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline disabled:opacity-50"
                >Cancel</button>
              </div>
            </div>
            <div>
              <textarea
                v-model="transitionNotes"
                rows="2"
                aria-label="Transition notes (optional)"
                placeholder="Notes for this transition (optional)..."
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              ></textarea>
            </div>
            <div v-if="transitionError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ transitionError }}</div>
          </div>
        </div>
        <!-- Child rolls card (bulk rolls only) -->
        <div v-if="roll.transitionProfile === 'bulk'" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Child Rolls</h2>
            <span class="text-xs text-gray-600 dark:text-gray-400">{{ childRolls.length }} roll{{ childRolls.length !== 1 ? 's' : '' }} cut</span>
          </div>
          <div v-if="childRolls.length === 0" class="text-sm text-gray-600 dark:text-gray-400 italic">No rolls cut from this canister yet.</div>
          <ul v-else class="space-y-2">
            <li v-for="child in childRolls" :key="child._key" class="flex items-center justify-between text-sm">
              <button
                @click="router.push({ name: 'roll-detail', params: { key: child._key } })"
                class="text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >{{ child.rollId }}</button>
              <span
                class="px-2 text-xs leading-5 font-semibold rounded-full"
                :class="getStateColor(child.state)"
              >{{ child.state }}</span>
            </li>
          </ul>
        </div>

        <!-- Tags card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Tags</h2>
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              v-for="rt in rollTags"
              :key="rt._key"
              class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
              :style="{ backgroundColor: tagByKey[rt.tagKey]?.color ?? '#888' }"
            >
              {{ tagByKey[rt.tagKey]?.value ?? '…' }}
              <button
                @click="removeTag(rt._key!)"
                class="ml-1 leading-none hover:opacity-70 font-bold"
              >&times;</button>
            </span>
            <span v-if="rollTags.length === 0" class="text-sm text-gray-600 dark:text-gray-400 italic">No tags yet</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in availableTags"
              :key="tag._key"
              type="button"
              @click="addTag(tag)"
              class="px-2 py-1 rounded text-xs font-medium text-white opacity-40 hover:opacity-100 transition-opacity"
              :style="{ backgroundColor: tag.color }"
            >{{ tag.value }}</button>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to add a tag</p>
        </div>
      </div>

      <!-- Right: Transition History -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-fit">
        <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">History</h2>
        <div v-if="annotatedHistory.length === 0" class="text-sm text-gray-600 dark:text-gray-400 py-4 text-center">No history recorded yet.</div>
        <ol v-else class="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
          <li v-for="entry in annotatedHistory" :key="entry.stateId" class="ml-4">
            <div
              class="absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800"
              :class="entry.direction === 'backward' ? 'bg-orange-400' : entry.direction === 'initial' ? 'bg-gray-400' : 'bg-primary-500'"
            ></div>
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="px-2 text-xs leading-5 font-semibold rounded-full"
                :class="getStateColor(entry.state)"
              >{{ entry.state }}</span>
              <span v-if="entry.direction === 'backward'" class="text-xs text-orange-700 dark:text-orange-400">{{ entry.isErrorCorrection ? '↩ error correction' : '↩ backward' }}</span>
              <span v-if="entry.direction === 'initial'" class="text-xs text-gray-600 dark:text-gray-400">initial</span>
              <time class="text-xs text-gray-600 dark:text-gray-400">{{ formatDate(entry.date) }}</time>
            </div>
            <p v-if="entry.notes" class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ entry.notes }}</p>
            <p v-if="entry.metadata?.temperature != null" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ entry.metadata.temperature }}{{ temperatureUnit }}</p>
            <p v-if="entry.metadata?.shotISO != null" class="mt-1 text-xs text-gray-500 dark:text-gray-400">Shot at ISO {{ entry.metadata.shotISO }}</p>
            <p v-if="entry.metadata?.scansReceived || entry.metadata?.negativesReceived" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span v-if="entry.metadata?.scansReceived">Scans received {{ formatDate(entry.metadata.scansDate as string) }}<span v-if="entry.metadata?.scansUrl"> · <a :href="entry.metadata.scansUrl as string" target="_blank" class="text-primary-600 dark:text-primary-400 hover:underline">View scans</a></span></span>
              <span v-if="entry.metadata?.scansReceived && entry.metadata?.negativesReceived"> · </span>
              <span v-if="entry.metadata?.negativesReceived">Negatives received {{ formatDate(entry.metadata.negativesDate as string) }}</span>
            </p>
            <p v-if="entry.metadata?.labName" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ entry.metadata.labName }} · {{ entry.metadata.deliveryMethod }} · {{ entry.metadata.processRequested }}<span v-if="entry.metadata.pushPullStops != null"> · {{ (entry.metadata.pushPullStops as number) > 0 ? '+' : '' }}{{ entry.metadata.pushPullStops }} stops</span>
            </p>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { rollApi, rollStateApi, rollTagApi, tagApi, transitionApi } from '@/services/api-client'
import type { Roll, RollStateHistory, Tag, RollTag, TransitionGraph } from '@/types'
import { RollState } from '@/types'
import { useNotificationStore } from '@/stores/notification'

const route = useRoute()
const router = useRouter()
const notification = useNotificationStore()

const roll = ref<Roll | null>(null)
const parentRoll = ref<Roll | null>(null)
const childRolls = ref<Roll[]>([])
const history = ref<RollStateHistory[]>([])
const rollTags = ref<RollTag[]>([])
const allTags = ref<Tag[]>([])
const loading = ref(true)
const transitionNotes = ref('')
const transitionError = ref('')
const transitionSubmitting = ref(false)
const pendingTransition = ref<RollState | null>(null)
const pendingMetadataTransition = ref<RollState | null>(null)
const metadataTemperature = ref('')
const metadataShotISO = ref('')
const metadataLabName = ref('')
const metadataDeliveryMethod = ref('')
const metadataProcessRequested = ref('')
const metadataPushPullStops = ref('')
const metadataFormError = ref('')
const metadataDate = ref('')

const metadataScansReceived = ref(false)
const metadataScansUrl = ref('')
const metadataScansDate = ref('')
const metadataNegativesReceived = ref(false)
const metadataNegativesDate = ref('')

const DELIVERY_METHODS = ['Drop off', 'Mail in'] as const
const PROCESSES_REQUESTED = ['C-41', 'E-6', 'ECN-2', 'Black & White', 'Instant'] as const

const todayISO = () => new Date().toISOString().slice(0, 10)

const isImperial = navigator.language === 'en-US'
const temperatureUnit = isImperial ? '°F' : '°C'
const TEMPERATURE_DEFAULTS: Partial<Record<RollState, number>> = {
  [RollState.FROZEN]: isImperial ? 0 : -18,
  [RollState.REFRIGERATED]: isImperial ? 39 : 4,
  [RollState.SHELVED]: isImperial ? 65 : 18,
}

const transitionGraph = ref<TransitionGraph>({ states: [], transitions: [] })

const isBackwardTransition = (from: RollState, to: RollState): boolean =>
  transitionGraph.value.transitions.some(
    t => t.fromState === from && t.toState === to && t.transitionType === 'BACKWARD',
  )

const validTransitions = computed(() =>
  roll.value
    ? transitionGraph.value.transitions
        .filter(t => t.fromState === roll.value!.state)
        .map(t => t.toState as RollState)
    : [],
)

const getTransitionEdge = (targetState: RollState) =>
  transitionGraph.value.transitions.find(
    t => t.fromState === roll.value?.state && t.toState === targetState,
  )

const requiresMetadataForm = (targetState: RollState): boolean => {
  const t = getTransitionEdge(targetState)
  return !!t && (t.metadata.length > 0 || t.requiresDate)
}

const requiresDateCapture = (targetState: RollState): boolean => {
  const t = getTransitionEdge(targetState)
  return !!t && t.requiresDate
}

const tagByKey = computed(() => {
  const map: Record<string, Tag> = {}
  for (const t of allTags.value) {
    if (t._key) map[t._key] = t
  }
  return map
})

const availableTags = computed(() => {
  const assignedKeys = new Set(rollTags.value.map(rt => rt.tagKey))
  return allTags.value.filter(t => t.isRollScoped && !assignedKeys.has(t._key!))
})

type AnnotatedEntry = RollStateHistory & { direction: 'forward' | 'backward' | 'initial' }

const annotatedHistory = computed((): AnnotatedEntry[] => {
  const sorted = history.value.slice().sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  return sorted
    .map((entry, idx): AnnotatedEntry => {
      if (idx === 0) return { ...entry, direction: 'initial' }
      const prev = sorted[idx - 1]
      const direction = isBackwardTransition(prev.state, entry.state) ? 'backward' : 'forward'
      return { ...entry, direction }
    })
    .reverse()
})

const getStateColor = (state: RollState) => {
  const colors: Record<string, string> = {
    Added: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
    Frozen: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    Refrigerated: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
    Shelved: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    Loaded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    Finished: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    'Sent For Development': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
    Developed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
    Received: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
  }
  return colors[state] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

const formatDate = (date: Date | string) => new Date(date as string).toLocaleDateString()

const handleTransition = (targetState: RollState) => {
  if (!roll.value) return
  if (isBackwardTransition(roll.value.state, targetState)) {
    pendingTransition.value = targetState
    return
  }
  if (requiresMetadataForm(targetState)) {
    pendingMetadataTransition.value = targetState
    metadataTemperature.value = String(TEMPERATURE_DEFAULTS[targetState] ?? '')
    metadataShotISO.value = targetState === RollState.FINISHED && roll.value?.stockSpeed ? String(roll.value.stockSpeed) : ''
    metadataLabName.value = ''
    metadataDeliveryMethod.value = ''
    metadataProcessRequested.value = ''
    metadataPushPullStops.value = ''
    metadataFormError.value = ''
    metadataDate.value = todayISO()
    metadataScansReceived.value = false
    metadataScansUrl.value = ''
    metadataScansDate.value = todayISO()
    metadataNegativesReceived.value = false
    metadataNegativesDate.value = todayISO()
    return
  }
  void executeTransition(targetState)
}

const submitMetadataTransition = () => {
  if (!pendingMetadataTransition.value) return
  const target = pendingMetadataTransition.value

  if (target === RollState.SENT_FOR_DEVELOPMENT) {
    if (!metadataLabName.value.trim()) { metadataFormError.value = 'Lab name is required.'; return }
    if (!metadataDeliveryMethod.value) { metadataFormError.value = 'Delivery method is required.'; return }
    if (!metadataProcessRequested.value) { metadataFormError.value = 'Process is required.'; return }
  }

  if (requiresDateCapture(target) && !metadataDate.value) {
    metadataFormError.value = 'Date is required.'
    return
  }

  const temp = metadataTemperature.value !== '' ? parseFloat(metadataTemperature.value) : undefined
  const shotISO = metadataShotISO.value !== '' ? parseFloat(metadataShotISO.value) : undefined
  const pushPullStops = metadataPushPullStops.value !== '' ? parseInt(metadataPushPullStops.value, 10) : undefined
  let date: string | undefined
  if (requiresDateCapture(target) && metadataDate.value) {
    const [year, month, day] = metadataDate.value.split('-').map(Number)
    const now = new Date()
    date = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString()
  }
  pendingMetadataTransition.value = null

  const metadata: Record<string, unknown> = {}
  if (temp != null) metadata.temperature = temp
  if (shotISO != null) metadata.shotISO = shotISO
  if (metadataLabName.value.trim()) metadata.labName = metadataLabName.value.trim()
  if (metadataDeliveryMethod.value) metadata.deliveryMethod = metadataDeliveryMethod.value
  if (metadataProcessRequested.value) metadata.processRequested = metadataProcessRequested.value
  if (pushPullStops != null) metadata.pushPullStops = pushPullStops
  if (metadataScansReceived.value) {
    metadata.scansReceived = true
    metadata.scansDate = metadataScansDate.value || todayISO()
    if (metadataScansUrl.value.trim()) metadata.scansUrl = metadataScansUrl.value.trim()
  }
  if (metadataNegativesReceived.value) {
    metadata.negativesReceived = true
    metadata.negativesDate = metadataNegativesDate.value || todayISO()
  }
  void executeTransition(target, undefined, Object.keys(metadata).length > 0 ? metadata : undefined, date)
}

const confirmTransition = (isErrorCorrection: boolean) => {
  if (!pendingTransition.value) return
  const target = pendingTransition.value
  pendingTransition.value = null
  void executeTransition(target, isErrorCorrection)
}

const executeTransition = async (targetState: RollState, isErrorCorrection?: boolean, metadata?: Record<string, unknown>, date?: string) => {
  if (!roll.value) return
  transitionSubmitting.value = true
  transitionError.value = ''
  try {
    await rollApi.transition(roll.value._key!, targetState, date, transitionNotes.value || undefined, isErrorCorrection, metadata)
    transitionNotes.value = ''
    await loadData()
    notification.announce(`Roll moved to ${targetState}`)
  } catch {
    transitionError.value = 'Failed to transition roll. Please try again.'
  } finally {
    transitionSubmitting.value = false
  }
}

const addTag = async (tag: Tag) => {
  if (!roll.value) return
  try {
    await rollTagApi.create({ rollKey: roll.value._key!, tagKey: tag._key! })
    await loadRollTags()
  } catch (err) {
    console.error('Error adding tag:', err)
  }
}

const removeTag = async (rollTagKey: string) => {
  try {
    await rollTagApi.delete(rollTagKey)
    await loadRollTags()
  } catch (err) {
    console.error('Error removing tag:', err)
  }
}

const loadRollTags = async () => {
  if (!roll.value) return
  const response = await rollTagApi.getAll({ rollKey: roll.value._key })
  rollTags.value = response.data
}

const loadData = async () => {
  const key = route.params.key as string
  const [rollRes, historyRes, tagsRes] = await Promise.all([
    rollApi.getById(key),
    rollStateApi.getHistory(key),
    tagApi.getAll(),
  ])
  roll.value = rollRes.data
  history.value = historyRes.data
  allTags.value = tagsRes.data
  await Promise.all([
    loadRollTags(),
    roll.value?.parentRollId
      ? rollApi.getById(roll.value.parentRollId).then(r => { parentRoll.value = r.data })
      : Promise.resolve().then(() => { parentRoll.value = null }),
    roll.value?.transitionProfile === 'bulk'
      ? rollApi.getChildren(key).then(r => { childRolls.value = r.data })
      : Promise.resolve().then(() => { childRolls.value = [] }),
  ])
}

const reload = async () => {
  loading.value = true
  try {
    await loadData()
    const graphRes = await transitionApi.getGraph(
      roll.value?.transitionProfile ?? 'standard',
    )
    transitionGraph.value = graphRes.data
  } finally {
    loading.value = false
  }
}

onMounted(reload)
watch(() => route.params.key, reload)
</script>
