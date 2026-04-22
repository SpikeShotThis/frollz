<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import {
  NButton,
  NDrawer,
  NDrawerContent,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  NSpace,
  NText,
  NThing,
  type MenuOption
} from 'naive-ui';
import { useAuthStore } from '../stores/auth.js';
import { CollapseIcon, DashboardIcon, EmulsionIcon, ExpandIcon, FilmIcon, MenuIcon, DeviceIcon } from '../components/shell/icons.js';

const SIDEBAR_COLLAPSED_KEY = 'frollz.shell.sider.collapsed';
const LAST_ACTIVE_SECTION_KEY = 'frollz.shell.last-section';
const MOBILE_BREAKPOINT = 900;

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const isMobile = ref(false);
const isMobileMenuOpen = ref(false);
const isSidebarCollapsed = ref(false);
const lastActiveSection = ref<string | null>(null);

const navIconByKey = {
  dashboard: DashboardIcon,
  film: FilmIcon,
  devices: DeviceIcon,
  emulsions: EmulsionIcon
} as const;

const navRoutes = computed(() =>
  router
    .getRoutes()
    .filter((record) => record.meta.layout === 'app' && record.meta.showInNav)
    .sort((a, b) => (Number(a.meta.order) || 0) - (Number(b.meta.order) || 0))
);

const menuOptions = computed<MenuOption[]>(() =>
  navRoutes.value.map((record) => {
    const iconKey = String(record.meta.icon ?? '');
    const icon = navIconByKey[iconKey as keyof typeof navIconByKey];
    const option: MenuOption = {
      key: record.path,
      label: String(record.meta.title ?? record.name ?? record.path)
    };

    if (icon) {
      option.icon = () => h(NIcon, null, { default: () => h(icon) });
    }

    return option;
  })
);

const selectedKey = computed(() => {
  const explicitNavKey = route.meta.navKey;
  if (typeof explicitNavKey === 'string') {
    return explicitNavKey;
  }

  const currentPath = route.path;
  const directMatch = navRoutes.value.find((navRoute) => navRoute.path === currentPath);
  if (directMatch) {
    return directMatch.path;
  }

  const prefixMatch = navRoutes.value.find((navRoute) => currentPath.startsWith(`${navRoute.path}/`));
  if (prefixMatch) {
    return prefixMatch.path;
  }

  return lastActiveSection.value;
});

const headerTitle = computed(() => String(route.meta.title ?? 'Frollz2'));

function syncViewportState(): void {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
  if (!isMobile.value) {
    isMobileMenuOpen.value = false;
  }
}

function readShellState(): void {
  try {
    isSidebarCollapsed.value = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    lastActiveSection.value = localStorage.getItem(LAST_ACTIVE_SECTION_KEY);
  } catch {
    isSidebarCollapsed.value = false;
    lastActiveSection.value = null;
  }
}

function toggleDesktopSidebar(): void {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

function handleMenuSelect(key: string): void {
  isMobileMenuOpen.value = false;
  void router.push(key);
}

async function handleLogout(): Promise<void> {
  await authStore.logout();
  isMobileMenuOpen.value = false;
  await router.push('/login');
}

watch(
  isSidebarCollapsed,
  (value) => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0');
    } catch {
      // Ignore storage errors in private or constrained environments.
    }
  },
  { immediate: false }
);

watch(
  selectedKey,
  (value) => {
    if (!value) {
      return;
    }

    lastActiveSection.value = value;
    try {
      localStorage.setItem(LAST_ACTIVE_SECTION_KEY, value);
    } catch {
      // Ignore storage errors in private or constrained environments.
    }
  },
  { immediate: true }
);

onMounted(() => {
  readShellState();
  syncViewportState();
  window.addEventListener('resize', syncViewportState);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewportState);
});
</script>

<template>
  <NLayout has-sider class="app-shell">
    <NLayoutSider
      v-if="authStore.isAuthenticated && !isMobile"
      bordered
      collapse-mode="width"
      :collapsed="isSidebarCollapsed"
      :collapsed-width="64"
      :width="220"
      show-trigger="bar"
      :native-scrollbar="false"
      class="app-shell__sider"
      @update:collapsed="(value) => { isSidebarCollapsed = value; }"
    >
      <div class="app-shell__brand">
        <NThing :title="isSidebarCollapsed ? 'F2' : 'Frollz2'" :description="isSidebarCollapsed ? '' : 'Admin shell'" />
      </div>
      <NMenu :value="selectedKey" :collapsed="isSidebarCollapsed" :collapsed-width="64" :options="menuOptions" @update:value="handleMenuSelect" />
    </NLayoutSider>

    <NLayout>
      <NLayoutHeader bordered class="app-shell__header">
        <NSpace justify="space-between" align="center" :wrap="false" style="width: 100%;">
          <NSpace align="center" :wrap="false">
            <NButton
              v-if="isMobile"
              aria-label="Menu"
              secondary
              circle
              @click="isMobileMenuOpen = true"
            >
              <template #icon>
                <NIcon><MenuIcon /></NIcon>
              </template>
            </NButton>
            <NButton v-else aria-label="Toggle sidebar" secondary circle @click="toggleDesktopSidebar">
              <template #icon>
                <NIcon>
                  <CollapseIcon v-if="!isSidebarCollapsed" />
                  <ExpandIcon v-else />
                </NIcon>
              </template>
            </NButton>
            <NText strong class="app-shell__title">{{ headerTitle }}</NText>
          </NSpace>
          <NSpace align="center" :wrap="false">
            <NText v-if="authStore.user" depth="3" class="app-shell__user">{{ authStore.user.email }}</NText>
            <NButton tertiary type="error" @click="handleLogout">Logout</NButton>
          </NSpace>
        </NSpace>
      </NLayoutHeader>

      <NLayoutContent class="app-shell__content">
        <RouterView />
      </NLayoutContent>
    </NLayout>
  </NLayout>

  <NDrawer v-model:show="isMobileMenuOpen" placement="left" width="280">
    <NDrawerContent title="Navigation" closable>
      <NSpace vertical size="large">
        <NMenu :value="selectedKey" :options="menuOptions" @update:value="handleMenuSelect" />
        <NButton type="error" secondary @click="handleLogout">Logout</NButton>
      </NSpace>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.app-shell__sider {
  border-right: 1px solid var(--n-border-color);
}

.app-shell__brand {
  padding: 16px 12px 10px;
}

.app-shell__header {
  align-items: center;
  display: flex;
  min-height: 64px;
  padding: 0 16px;
}

.app-shell__title {
  letter-spacing: 0.01em;
}

.app-shell__user {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-shell__content {
  min-height: calc(100vh - 64px);
}

@media (max-width: 900px) {
  .app-shell__header {
    padding: 0 12px;
  }

  .app-shell__user {
    display: none;
  }
}
</style>
