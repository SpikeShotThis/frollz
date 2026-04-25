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
  return value === 'system' || value === 'light' || value === 'dark';
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function readSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const themePreference = ref<ThemePreference>(readStoredPreference());
const systemPrefersDark = ref<boolean>(readSystemPrefersDark());

const isDarkMode = computed(() => {
  if (themePreference.value === 'system') {
    return systemPrefersDark.value;
  }

  return themePreference.value === 'dark';
});

let isBound = false;

export function useTheme() {
  if (!isBound) {
    isBound = true;

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = (event: MediaQueryListEvent): void => {
        systemPrefersDark.value = event.matches;
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', onChange);
      } else {
        mediaQuery.addListener(onChange);
      }
    }

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

  const activeThemeLabel = computed(() => {
    return themeOptions.find((option) => option.value === themePreference.value)?.label ?? 'System';
  });

  return {
    themePreference,
    themeOptions,
    isDarkMode,
    activeThemeLabel,
    setThemePreference
  };
}
