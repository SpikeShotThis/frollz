import type { GlobalThemeOverrides } from 'naive-ui';
import { darkTheme } from 'naive-ui'

// ─── PrimeVue Lara Dark · Primary: Cyan · Surface: Ocean ─────────────────────
//
// "Ocean" surface = a cool blue-tinted slate scale (PrimeVue's ocean preset).
// Cyan primary = PrimeVue's built-in cyan palette.
// Lara = Bootstrap-inspired: rounded corners, clear borders, compact density.
// Ripple = handled at the component level via n-config-provider's `ripple` prop.
// ─────────────────────────────────────────────────────────────────────────────

// Ocean surface palette (blue-tinted dark slate, mirrors PrimeVue Ocean dark)
const ocean = {
  0: '#ffffff',
  50: '#f2f4f6',
  100: '#dde3ea',
  200: '#b9c5d4',
  300: '#8fa3b8',
  400: '#64809b',
  500: '#4a6580',
  600: '#364e66',
  700: '#243a50',
  800: '#152537',
  900: '#0c1824',
  950: '#070e16',
}

// PrimeVue Cyan primary palette
const cyan = {
  50: '#ecfeff',
  100: '#cffafe',
  200: '#a5f3fc',
  300: '#67e8f9',
  400: '#22d3ee',
  500: '#06b6d4',  // ← primary action color
  600: '#0891b2',
  700: '#0e7490',
  800: '#155e75',
  900: '#164e63',
  950: '#083344',
}

export const theme = darkTheme  // pass to <n-config-provider :theme="theme">

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    // ── Brand / Primary ───────────────────────────────────────────────────
    primaryColor: cyan[500],
    primaryColorHover: cyan[400],
    primaryColorPressed: cyan[600],
    primaryColorSuppl: cyan[300],

    // ── Surfaces (Ocean dark) ─────────────────────────────────────────────
    baseColor: ocean[0],
    bodyColor: ocean[900],      // page background
    cardColor: ocean[800],      // card / panel bg
    modalColor: ocean[800],
    popoverColor: ocean[700],
    tableColor: ocean[800],
    inputColor: ocean[800],
    codeColor: ocean[900],
    tagColor: ocean[700],
    avatarColor: ocean[700],
    invertedColor: ocean[950],

    // ── Text ──────────────────────────────────────────────────────────────
    textColorBase: '#e2e8f0',       // slightly warm white, Lara style
    textColor1: '#e2e8f0',
    textColor2: '#94a3b8',
    textColor3: '#8fa3b8',       // ocean[300]
    textColorDisabled: ocean[500],
    placeholderColor: ocean[400],
    placeholderColorDisabled: ocean[500],

    // ── Borders ───────────────────────────────────────────────────────────
    dividerColor: ocean[700],
    borderColor: ocean[600],
    closeIconColor: '#94a3b8',
    closeIconColorHover: '#e2e8f0',

    // ── Lara-style: 6px border radius, moderate density ──────────────────
    borderRadius: '6px',
    borderRadiusSmall: '4px',

    // ── Shadows (Lara uses soft, layered shadows) ─────────────────────────
    boxShadow1: '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
    boxShadow2: '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.4)',
    boxShadow3: '0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.4)',

    // ── Typography (Lara uses system / Bootstrap-style stack) ────────────
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontFamilyMono:
      "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
    fontSize: '14px',
    fontSizeMini: '11px',
    fontSizeTiny: '12px',
    fontSizeSmall: '13px',
    fontSizeMedium: '14px',
    fontSizeLarge: '16px',
    fontSizeHuge: '18px',
    lineHeight: '1.5',

    // ── Functional colors ─────────────────────────────────────────────────
    successColor: '#22c55e',
    successColorHover: '#16a34a',
    successColorPressed: '#15803d',
    successColorSuppl: '#4ade80',

    warningColor: '#f59e0b',
    warningColorHover: '#d97706',
    warningColorPressed: '#b45309',
    warningColorSuppl: '#fbbf24',

    errorColor: '#ef4444',
    errorColorHover: '#dc2626',
    errorColorPressed: '#b91c1c',
    errorColorSuppl: '#f87171',

    infoColor: cyan[500],
    infoColorHover: cyan[400],
    infoColorPressed: cyan[600],
    infoColorSuppl: cyan[300],

    // ── Heights (Lara compact-ish density) ────────────────────────────────
    heightTiny: '28px',
    heightSmall: '36px',
    heightMedium: '44px',
    heightLarge: '48px',
    heightHuge: '52px',
  },

  // ── Component-level tweaks to match Lara's Bootstrap-inspired style ────────
  Button: {
    borderRadiusMedium: '6px',
    borderRadiusSmall: '4px',
    borderRadiusLarge: '8px',
    fontWeightStrong: '600',
    // Ripple wave uses primaryColor automatically in naive-ui dark theme
  },

  Input: {
    borderRadius: '6px',
    color: ocean[800],
    colorFocus: ocean[700],
    border: `1px solid ${ocean[600]}`,
    borderFocus: `1px solid ${cyan[500]}`,
    borderHover: `1px solid ${cyan[400]}`,
    boxShadowFocus: `0 0 0 3px ${cyan[500]}33`,  // Lara-style focus ring
    caretColor: cyan[400],
  },

  Select: {
    peers: {
      InternalSelection: {
        border: `1px solid ${ocean[600]}`,
        borderFocus: `1px solid ${cyan[500]}`,
        borderHover: `1px solid ${cyan[400]}`,
        borderRadius: '6px',
        color: ocean[800],
        boxShadowFocus: `0 0 0 3px ${cyan[500]}33`,
      },
      InternalSelectMenu: {
        borderRadius: '6px',
        color: ocean[800],
        optionColorActive: `${cyan[500]}20`,
        optionColorActivePending: `${cyan[500]}30`,
        optionTextColorActive: cyan[400],
      },
    },
  },

  Card: {
    borderRadius: '8px',
    color: ocean[800],
    colorEmbedded: ocean[900],
    borderColor: ocean[600],
    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.4)',
  },

  DataTable: {
    borderRadius: '8px',
    thColor: ocean[900],
    tdColor: ocean[800],
    borderColor: ocean[700],
    thTextColor: '#94a3b8',
    tdTextColor: '#e2e8f0',
    thFontWeight: '600',
  },

  Dialog: {
    borderRadius: '8px',
    color: ocean[800],
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.6), 0 4px 6px -4px rgba(0,0,0,0.5)',
  },

  Tabs: {
    tabBorderRadius: '6px',
    colorSegment: ocean[900],
  },

  Tag: {
    borderRadius: '4px',
    color: ocean[700],
    border: `1px solid ${ocean[600]}`,
  },

  Switch: {
    railColorActive: cyan[500],
    railColor: ocean[600],
  },

  Checkbox: {
    color: cyan[500],
    colorChecked: cyan[500],
    checkMarkColor: '#ffffff',
    border: `2px solid ${ocean[500]}`,
    borderChecked: `2px solid ${cyan[500]}`,
    boxShadowFocus: `0 0 0 3px ${cyan[500]}33`,
  },

  Radio: {
    dotColorActive: cyan[500],
    boxShadowActive: `0 0 0 3px ${cyan[500]}33`,
  },

  Menu: {
    color: ocean[900],
    itemColorActive: `${cyan[500]}20`,
    itemColorActiveHover: `${cyan[500]}30`,
    itemColorHover: ocean[800],
    itemTextColorActive: cyan[400],
    borderRadius: '6px',
  },
}
