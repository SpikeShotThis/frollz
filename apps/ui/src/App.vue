<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter, RouterView } from 'vue-router';
import {
  NConfigProvider,
  NDrawer,
  NDrawerContent,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  NButton,
  NSpace,
  NText,
  NThing,
  NMessageProvider
} from 'naive-ui';
import { useAuthStore } from './stores/auth.js';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const menuOptions = [
  { label: 'Film', key: '/film' },
  { label: 'Receivers', key: '/receivers' },
  { label: 'Emulsions', key: '/emulsions' }
];

const mobileBreakpoint = 900;
const isMobile = ref(false);
const isMobileMenuOpen = ref(false);

const selectedKey = computed(() => {
  if (route.path.startsWith('/film')) {
    return '/film';
  }
  if (route.path.startsWith('/receivers')) {
    return '/receivers';
  }
  if (route.path.startsWith('/emulsions')) {
    return '/emulsions';
  }
  return route.path;
});

function syncViewportState(): void {
  isMobile.value = window.innerWidth < mobileBreakpoint;
  if (!isMobile.value) {
    isMobileMenuOpen.value = false;
  }
}

onMounted(async () => {
  syncViewportState();
  window.addEventListener('resize', syncViewportState);
  await authStore.restoreSession();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewportState);
});

async function handleLogout(): Promise<void> {
  await authStore.logout();
  isMobileMenuOpen.value = false;
  await router.push('/login');
}

function handleMenuSelect(key: string): void {
  isMobileMenuOpen.value = false;
  void router.push(key);
}
</script>

<template>
  <NConfigProvider>
    <NMessageProvider>
      <NLayout has-sider>
        <NLayoutSider
          v-if="authStore.isAuthenticated && !isMobile"
          bordered
          collapse-mode="width"
          :collapsed-width="64"
          :width="220"
          class="app-sider"
        >
          <NSpace vertical size="large" align="stretch">
            <NThing title="Frollz2" description="Film workflow tracker" />
            <NMenu :value="selectedKey" :options="menuOptions" @update:value="handleMenuSelect" />
            <NButton type="error" secondary @click="handleLogout">Logout</NButton>
          </NSpace>
        </NLayoutSider>
        <NLayout>
          <NLayoutHeader bordered class="app-header">
            <NSpace justify="space-between" align="center">
              <NSpace align="center">
                <NButton
                  v-if="authStore.isAuthenticated && isMobile"
                  aria-label="Open navigation menu"
                  secondary
                  @click="isMobileMenuOpen = true"
                >
                  Menu
                </NButton>
                <NText strong>Analog Film Tracker</NText>
              </NSpace>
              <NText v-if="authStore.user">{{ authStore.user.email }}</NText>
            </NSpace>
          </NLayoutHeader>
          <NLayoutContent class="app-content">
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
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
.app-sider {
  padding: 16px 12px;
}

.app-header {
  padding: 0 16px;
}

.app-content {
  min-height: calc(100vh - 64px);
}
</style>
