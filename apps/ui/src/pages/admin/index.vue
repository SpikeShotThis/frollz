<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const adminSections = [
  {
    title: 'Data Export & Import',
    description: 'Export or import your film tracking data',
    icon: 'cloud_download',
    route: '/admin/data-export',
    color: 'primary'
  },
  {
    title: 'Film Labs',
    description: 'Manage your film labs and ratings',
    icon: 'store',
    route: '/admin/film-labs',
    color: 'secondary'
  },
  {
    title: 'Film Suppliers',
    description: 'Manage your film suppliers and ratings',
    icon: 'local_shipping',
    route: '/admin/film-suppliers',
    color: 'accent'
  }
];

function navigateTo(route: string) {
  router.push(route);
}
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <div>
      <div class="text-h5">Admin</div>
      <div class="text-subtitle2 text-grey-7">System administration and data management</div>
    </div>

    <div class="row q-col-gutter-md">
      <div
        v-for="section in adminSections"
        :key="section.route"
        class="col-12 col-sm-6 col-md-4"
      >
        <q-card flat bordered class="cursor-pointer full-height" @click="navigateTo(section.route)">
          <q-card-section>
            <div class="row items-center q-gutter-md">
              <q-icon :name="section.icon" :color="section.color" size="48px" />
              <div class="col">
                <div class="text-h6">{{ section.title }}</div>
                <div class="text-caption text-grey-7">{{ section.description }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped lang="scss">
.cursor-pointer {
  cursor: pointer;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
}
</style>
