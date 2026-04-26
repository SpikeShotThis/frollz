<script lang="ts">
import { computed } from 'vue';
import { useTheme } from '../composables/useTheme.js';

type Swatch = {
  label: string;
  value: string;
};

type ThemePalette = {
  brandSwatches: Swatch[];
  surfaceSwatches: Swatch[];
  interactionSwatches: Swatch[];
  statusSwatches: Swatch[];
  shadowSoft: string;
  shadowStrong: string;
};

const lightPalette: ThemePalette = {
  brandSwatches: [
    { label: '--brand-primary', value: '#403d39' },
    { label: '--brand-secondary', value: '#ccc5b9' },
    { label: '--brand-accent', value: '#eb5e28' },
    { label: '--brand-dark', value: '#8c867d' },
    { label: '--brand-dark-page', value: '#252422' },
    { label: '--brand-positive', value: '#4a7c59' },
    { label: '--brand-negative', value: '#f25c54' },
    { label: '--brand-info', value: '#b0a1ba' },
    { label: '--brand-warning', value: '#f7b267' }
  ],
  surfaceSwatches: [
    { label: '--surface-0', value: '#f3efe8' },
    { label: '--surface-1', value: '#f8f4ee' },
    { label: '--surface-2', value: '#fffdf9' },
    { label: '--surface-3', value: '#ece3d7' },
    { label: '--surface-overlay', value: '#fffcf7d9' },
    { label: '--border-soft', value: '#d8cfc0' },
    { label: '--border-strong', value: '#c7bbab' },
    { label: '--text-strong', value: '#2f2b27' },
    { label: '--text-default', value: '#403d39' },
    { label: '--text-muted', value: '#7a736a' }
  ],
  interactionSwatches: [
    { label: '--interactive-primary', value: '#403d39' },
    { label: '--interactive-primary-hover', value: '#35322f' },
    { label: '--interactive-secondary', value: '#ccc5b9' },
    { label: '--interactive-secondary-hover', value: '#c0b7a9' },
    { label: '--interactive-accent', value: '#eb5e28' },
    { label: '--interactive-accent-hover', value: '#cf4f1f' },
    { label: '--interactive-focus-border', value: '#c86a45' },
    { label: '--interactive-focus-ring', value: '#f1b8a0' }
  ],
  statusSwatches: [
    { label: '--status-positive-bg', value: '#e7f3ea' },
    { label: '--status-negative-bg', value: '#fde9e8' },
    { label: '--status-warning-bg', value: '#fff1de' },
    { label: '--status-info-bg', value: '#f3ecf7' }
  ],
  shadowSoft: '0 12px 30px -18px rgba(37, 36, 34, 0.32)',
  shadowStrong: '0 20px 48px -24px rgba(37, 36, 34, 0.42)'
};

const darkPalette: ThemePalette = {
  brandSwatches: [
    { label: '--brand-primary', value: '#d7c9b6' },
    { label: '--brand-secondary', value: '#6f6558' },
    { label: '--brand-accent', value: '#d87a4d' },
    { label: '--brand-dark', value: '#b5ab9d' },
    { label: '--brand-dark-page', value: '#f0e8db' },
    { label: '--brand-positive', value: '#83b08e' },
    { label: '--brand-negative', value: '#f38c82' },
    { label: '--brand-info', value: '#bda8ca' },
    { label: '--brand-warning', value: '#e8ba72' }
  ],
  surfaceSwatches: [
    { label: '--surface-0', value: '#1f1d1a' },
    { label: '--surface-1', value: '#25221f' },
    { label: '--surface-2', value: '#2c2823' },
    { label: '--surface-3', value: '#332f29' },
    { label: '--surface-overlay', value: '#2c2823db' },
    { label: '--border-soft', value: '#5a5145' },
    { label: '--border-strong', value: '#706557' },
    { label: '--text-strong', value: '#f1e8d8' },
    { label: '--text-default', value: '#ddd4c6' },
    { label: '--text-muted', value: '#bbb1a3' }
  ],
  interactionSwatches: [
    { label: '--interactive-primary', value: '#e1d7c7' },
    { label: '--interactive-primary-hover', value: '#cec1ac' },
    { label: '--interactive-secondary', value: '#5c5348' },
    { label: '--interactive-secondary-hover', value: '#6a6154' },
    { label: '--interactive-accent', value: '#d87a4d' },
    { label: '--interactive-accent-hover', value: '#e28f66' },
    { label: '--interactive-focus-border', value: '#af6b4d' },
    { label: '--interactive-focus-ring', value: '#8b5c46' }
  ],
  statusSwatches: [
    { label: '--status-positive-bg', value: '#2d3f31' },
    { label: '--status-negative-bg', value: '#4a2c2a' },
    { label: '--status-warning-bg', value: '#4a3a26' },
    { label: '--status-info-bg', value: '#3d3348' }
  ],
  shadowSoft: '0 12px 30px -18px rgba(0, 0, 0, 0.68)',
  shadowStrong: '0 20px 48px -24px rgba(0, 0, 0, 0.78)'
};

const { isDarkMode } = useTheme();
const activePalette = computed<ThemePalette>(() => (isDarkMode.value ? darkPalette : lightPalette));
const brandSwatches = computed(() => activePalette.value.brandSwatches);
const surfaceSwatches = computed(() => activePalette.value.surfaceSwatches);
const interactionSwatches = computed(() => activePalette.value.interactionSwatches);
const statusSwatches = computed(() => activePalette.value.statusSwatches);

const themeMeta = computed(() => [
  { token: '--radius-xs', value: '8px', use: 'Menus, compact items' },
  { token: '--radius-sm', value: '10px', use: 'Banners, chips, nav pills' },
  { token: '--radius-md', value: '14px', use: 'Cards, tables, dialogs' },
  { token: '--radius-lg', value: '20px', use: 'Large hero blocks' },
  { token: '--shadow-soft', value: activePalette.value.shadowSoft, use: 'Default elevated surface' },
  { token: '--shadow-strong', value: activePalette.value.shadowStrong, use: 'Modal/dialog emphasis' }
]);

const typographyScale = [
  { style: 'text-h1', sample: 'Heading 1 / Display' },
  { style: 'text-h2', sample: 'Heading 2 / Section Hero' },
  { style: 'text-h3', sample: 'Heading 3 / Page Lead' },
  { style: 'text-h4', sample: 'Heading 4 / Section Title' },
  { style: 'text-h5', sample: 'Heading 5 / Card Title' },
  { style: 'text-h6', sample: 'Heading 6 / Dense Title' },
  { style: 'text-subtitle1', sample: 'Subtitle 1 / Emphasized Supporting Copy' },
  { style: 'text-subtitle2', sample: 'Subtitle 2 / Compact Supporting Copy' },
  { style: 'text-body1', sample: 'Body 1 / Default Paragraph Copy' },
  { style: 'text-body2', sample: 'Body 2 / Dense Paragraph Copy' },
  { style: 'text-caption', sample: 'Caption / Metadata and Hints' },
  { style: 'text-overline', sample: 'Overline / Eyebrow Label' }
] as const;

const typographyFamilies = [
  {
    role: 'Heading family',
    stack: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
    usage: 'Headings and prominent UI labels'
  },
  {
    role: 'Body family',
    stack: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', sans-serif",
    usage: 'Body text, form labels, table content'
  }
] as const;

const breakpoints = [
  { tier: 'xs', range: '0px - 599.99px', intent: 'Phones / single-column layouts' },
  { tier: 'sm', range: '600px - 1023.99px', intent: 'Large phones / small tablets' },
  { tier: 'md', range: '1024px - 1439.99px', intent: 'Tablets / laptops' },
  { tier: 'lg', range: '1440px - 1919.99px', intent: 'Desktop standard' },
  { tier: 'xl', range: '1920px+', intent: 'Wide desktop / large monitors' }
] as const;

const tableRows = [
  { token: 'Primary button', use: 'Main call-to-action', sample: 'High emphasis action' },
  { token: 'Secondary button', use: 'Supporting action', sample: 'Low emphasis action' },
  { token: 'Accent hover', use: 'Interactive feedback', sample: 'Links, focus moments, active accents' }
];
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <div>
      <div class="text-h5">Style Guide</div>
      <div class="text-subtitle2 text-grey-7">Modular theme reference for tokens, layout language, and component skins.
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-xs">Theme Modules</div>
        <div class="text-body2 text-grey-8">`src/css/theme/_tokens.scss`</div>
        <div class="text-body2 text-grey-8">`src/css/theme/_layout.scss`</div>
        <div class="text-body2 text-grey-8">`src/css/theme/_components.scss`</div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Brand Colors</div>
        <div class="row q-col-gutter-sm">
          <div v-for="swatch in brandSwatches" :key="swatch.label" class="col-6 col-sm-4 col-md-3">
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="style-chip" :style="{ backgroundColor: swatch.value }" />
                <div class="text-body2 text-weight-medium q-mt-sm">{{ swatch.label }}</div>
                <div class="text-caption text-grey-7">{{ swatch.value }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Surface + Text Tokens</div>
        <div class="row q-col-gutter-sm">
          <div v-for="swatch in surfaceSwatches" :key="swatch.label" class="col-6 col-sm-4 col-md-3">
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="style-chip" :style="{ backgroundColor: swatch.value }" />
                <div class="text-body2 text-weight-medium q-mt-sm">{{ swatch.label }}</div>
                <div class="text-caption text-grey-7">{{ swatch.value }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Interaction Tokens</div>
        <div class="row q-col-gutter-sm">
          <div v-for="swatch in interactionSwatches" :key="swatch.label" class="col-6 col-sm-4 col-md-3">
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="style-chip" :style="{ backgroundColor: swatch.value }" />
                <div class="text-body2 text-weight-medium q-mt-sm">{{ swatch.label }}</div>
                <div class="text-caption text-grey-7">{{ swatch.value }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Status Backgrounds</div>
        <div class="row q-col-gutter-sm">
          <div v-for="swatch in statusSwatches" :key="swatch.label" class="col-6 col-sm-3">
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="style-chip" :style="{ backgroundColor: swatch.value }" />
                <div class="text-body2 text-weight-medium q-mt-sm">{{ swatch.label }}</div>
                <div class="text-caption text-grey-7">{{ swatch.value }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Radius + Shadow Tokens</div>
        <q-table :rows="themeMeta" row-key="token" flat bordered :columns="[
          { name: 'token', label: 'Token', field: 'token', align: 'left' },
          { name: 'value', label: 'Value', field: 'value', align: 'left' },
          { name: 'use', label: 'Use', field: 'use', align: 'left' }
        ]" hide-pagination />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Typography Scale</div>
        <div class="column q-gutter-sm">
          <div v-for="item in typographyScale" :key="item.style" class="typography-row q-pa-sm rounded-borders">
            <div class="text-caption text-grey-7">{{ item.style }}</div>
            <div :class="item.style">{{ item.sample }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Typography Families</div>
        <q-table :rows="typographyFamilies" row-key="role" flat bordered :columns="[
          { name: 'role', label: 'Role', field: 'role', align: 'left' },
          { name: 'stack', label: 'Font Stack', field: 'stack', align: 'left' },
          { name: 'usage', label: 'Usage', field: 'usage', align: 'left' }
        ]" hide-pagination />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Breakpoints (Quasar Defaults)</div>
        <q-table :rows="breakpoints" row-key="tier" flat bordered :columns="[
          { name: 'tier', label: 'Tier', field: 'tier', align: 'left' },
          { name: 'range', label: 'Viewport Range', field: 'range', align: 'left' },
          { name: 'intent', label: 'Design Intent', field: 'intent', align: 'left' }
        ]" hide-pagination />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Buttons, Chips, Badges</div>
        <div class="row items-center q-gutter-sm q-mb-md">
          <q-btn color="primary" label="Primary" />
          <q-btn color="secondary" label="Secondary" />
          <q-btn color="accent" label="Accent" />
          <q-btn flat label="Flat" />
        </div>
        <div class="row items-center q-gutter-sm">
          <q-chip>Default chip</q-chip>
          <q-chip color="secondary" text-color="white">Secondary chip</q-chip>
          <q-badge color="primary">Primary badge</q-badge>
          <q-badge color="negative">Negative badge</q-badge>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Form Controls</div>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input filled label="Input sample" model-value="Earthy field" />
          </div>
          <div class="col-12 col-md-6">
            <q-select filled label="Select sample" model-value="Primary"
              :options="['Primary', 'Secondary', 'Accent']" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Feedback Banners</div>
        <div class="column q-gutter-sm">
          <q-banner class="bg-green-1 text-positive" rounded>Positive feedback sample</q-banner>
          <q-banner class="bg-red-1 text-negative" rounded>Negative feedback sample</q-banner>
          <q-banner class="bg-orange-1 text-warning" rounded>Warning feedback sample</q-banner>
          <q-banner class="bg-purple-1 text-info" rounded>Info feedback sample</q-banner>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Table & Link States</div>
        <q-table :rows="tableRows" row-key="token" flat bordered :columns="[
          { name: 'token', label: 'Token', field: 'token', align: 'left' },
          { name: 'use', label: 'Use', field: 'use', align: 'left' },
          { name: 'sample', label: 'Sample', field: 'sample', align: 'left' }
        ]" hide-pagination>
          <template #body-cell-sample="props">
            <q-td :props="props">
              <a href="#">{{ props.row.sample }}</a>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.style-chip {
  height: 42px;
  border-radius: 10px;
  border: 1px solid var(--border-soft);
}

.typography-row {
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-2) 65%, transparent);
}
</style>
