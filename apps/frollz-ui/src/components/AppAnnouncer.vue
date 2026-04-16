<template>
  <!-- Always-present sr-only live regions — screen readers listen here for announcements -->
  <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
    {{ politeMessage }}
  </div>
  <div role="alert" aria-live="assertive" aria-atomic="true" class="sr-only">
    {{ assertiveMessage }}
  </div>

  <!-- Visual toast (aria-hidden because the live regions above handle AT) -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-2 opacity-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="translate-y-2 opacity-0"
  >
    <div
      v-if="store.message"
      aria-hidden="true"
      class="fixed bottom-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white"
      :class="
        store.type === 'success'
          ? 'bg-green-600 dark:bg-green-700'
          : 'bg-red-600 dark:bg-red-700'
      "
    >
      {{ store.message }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNotificationStore } from "@/stores/notification";

const store = useNotificationStore();

const politeMessage = computed(() =>
  store.type === "success" ? store.message : "",
);
const assertiveMessage = computed(() =>
  store.type === "error" ? store.message : "",
);
</script>
