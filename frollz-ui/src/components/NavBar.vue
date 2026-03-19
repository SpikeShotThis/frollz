<template>
  <nav class="bg-white dark:bg-gray-800 shadow-lg">
    <div class="max-w-screen-xl mx-auto page-x">
      <div class="flex justify-between items-center py-4">
        <!-- Brand -->
        <div class="flex items-center space-x-4">
          <span class="text-2xl font-bold text-primary-600 dark:text-primary-400">Frollz</span>
          <span class="text-gray-500 dark:text-gray-400">Film Roll Tracker</span>
        </div>

        <!-- Desktop nav links — visible on md and wider -->
        <div class="hidden md:flex items-center space-x-6">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="nav-link"
            :class="{ active: $route.name === link.name }"
          >{{ link.label }}</RouterLink>

          <button
            @click="themeStore.toggle()"
            class="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            :aria-label="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <SunIcon v-if="themeStore.isDark" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>
        </div>

        <!-- Mobile controls: theme toggle + hamburger — hidden on md and wider -->
        <div class="flex items-center gap-2 md:hidden">
          <button
            @click="themeStore.toggle()"
            class="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            :aria-label="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <SunIcon v-if="themeStore.isDark" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>

          <button
            ref="hamburgerRef"
            @click="openMenu"
            aria-label="Open navigation"
            :aria-expanded="menuOpen"
            aria-controls="mobile-nav-drawer"
            class="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <Bars3Icon class="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>

    <!-- Backdrop — closes drawer on tap outside -->
    <Transition name="fade">
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- backdrop overlay; keyboard close via Escape on drawer is the accessible path -->
      <div
        v-if="menuOpen"
        data-testid="nav-backdrop"
        class="fixed inset-0 bg-black/50 z-40"
        aria-hidden="true"
        @click="closeMenu"
      />
    </Transition>

    <!-- Bottom sheet drawer -->
    <Transition name="slide-up">
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- role=dialog container; @keydown is required for focus trap and Escape handling -->
      <div
        v-if="menuOpen"
        id="mobile-nav-drawer"
        ref="drawerRef"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl z-50"
        @keydown="handleKeydown"
      >
        <!-- Drag handle (decorative) -->
        <div class="flex justify-center pt-3 pb-2" aria-hidden="true">
          <div class="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        <!-- Nav links with large tap targets (≥44px per WCAG 2.5.5) -->
        <nav
          aria-label="Mobile navigation"
          class="page-x pt-2 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-1"
        >
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="drawer-link"
            :class="{ active: $route.name === link.name }"
            @click="closeMenu"
          >{{ link.label }}</RouterLink>
        </nav>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { SunIcon, MoonIcon } from '@heroicons/vue/24/outline'
import { Bars3Icon } from '@heroicons/vue/24/outline'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const navLinks = [
  { to: '/', name: 'dashboard', label: 'Dashboard' },
  { to: '/formats', name: 'formats', label: 'Film Formats' },
  { to: '/emulsions', name: 'emulsions', label: 'Emulsions' },
  { to: '/films', name: 'films', label: 'Films' },
  { to: '/tags', name: 'tags', label: 'Tags' },
] as const

const menuOpen = ref(false)
const hamburgerRef = ref<HTMLButtonElement | null>(null)
const drawerRef = ref<HTMLElement | null>(null)

function openMenu() {
  menuOpen.value = true
}

function closeMenu() {
  menuOpen.value = false
}

// Focus first drawer element on open; return focus to hamburger on close.
// Also lock body scroll while drawer is open.
watch(menuOpen, async (open) => {
  if (open) {
    document.body.style.overflow = 'hidden'
    await nextTick()
    const first = drawerRef.value?.querySelector<HTMLElement>('a, button, [tabindex="0"]')
    first?.focus()
  } else {
    document.body.style.overflow = ''
    hamburgerRef.value?.focus()
  }
})

// Tab trap + Escape handler for the drawer
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeMenu()
    return
  }
  if (e.key !== 'Tab') return

  const focusable = Array.from(
    drawerRef.value?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]') ?? [],
  )
  if (!focusable.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

// Close drawer automatically when viewport expands past md breakpoint
const mdQuery = window.matchMedia('(min-width: 768px)')
const onBreakpoint = (e: MediaQueryListEvent) => { if (e.matches) closeMenu() }
onMounted(() => mdQuery.addEventListener('change', onBreakpoint))
onUnmounted(() => {
  mdQuery.removeEventListener('change', onBreakpoint)
  // Restore scroll lock in case component unmounts while drawer is open
  document.body.style.overflow = ''
})
</script>

<style scoped>
@reference "../style.css";

/* Desktop nav links — min 44px tap target (WCAG 2.5.5) */
.nav-link {
  @apply inline-flex items-center px-3 min-h-[44px] rounded-md text-sm font-medium text-gray-500 hover:text-primary-600 hover:bg-gray-100 transition-colors duration-200 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-gray-700;
}
.nav-link.active {
  @apply text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-gray-700;
}

/* Mobile drawer links — min 44px tap target (WCAG 2.5.5) */
.drawer-link {
  @apply flex items-center px-4 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200;
  min-height: 44px;
}
.drawer-link.active {
  @apply text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-gray-700;
}

/* Backdrop fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Bottom sheet slide-up transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
