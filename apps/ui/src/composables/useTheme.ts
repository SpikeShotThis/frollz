import { computed, ref, watch } from 'vue';
import { Dark } from 'quasar';

const THEME_STORAGE_KEY = 'frollz2.themePreference';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeOption = {
  label: string;
  value: ThemePreference;
  icon: string;
};

export const themeOptions: ThemeOption[] = [
  { label: 'System', value: 'system', icon: 'brightness_auto' },
  { label: 'Light', value: 'light', icon: 'light_mode' },
  { label: 'Dark', value: 'dark', icon: 'dark_mode' }
];

function isThemePreference(value: string | null): value is ThemePreference {
  return themeOptions.some((o) => o.value === value);
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

const systemDarkQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

const themePreference = ref<ThemePreference>(readStoredPreference());
const systemPrefersDark = ref<boolean>(systemDarkQuery?.matches ?? false);

const isDarkMode = computed(() => {
  if (themePreference.value === 'system') {
    return systemPrefersDark.value;
  }
  return themePreference.value === 'dark';
});

const activeThemeLabel = computed(
  () => themeOptions.find((option) => option.value === themePreference.value)!.label
);

let isBound = false;

export function useTheme() {
  if (!isBound) {
    isBound = true;

    systemDarkQuery?.addEventListener('change', (event: MediaQueryListEvent) => {
      systemPrefersDark.value = event.matches;
    });

    watch(
      isDarkMode,
      (darkMode) => {
        Dark.set(darkMode);
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
      },
      { immediate: true }
    );
  }

  function setThemePreference(preference: ThemePreference): void {
    themePreference.value = preference;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Ignore storage write failures (private mode / blocked storage).
    }
  }

  return {
    themePreference,
    themeOptions,
    isDarkMode,
    activeThemeLabel,
    setThemePreference
  };
}
