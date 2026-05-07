import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pseudo from './locales/pseudo.json';

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pseudo: { translation: pseudo }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export { Trans, useTranslation } from 'react-i18next';
export type { TFunction } from 'i18next';
export { i18next as i18n };

export function changeLocale(locale: string): void {
  void i18next.changeLanguage(locale);
}

export const LOCALES = {
  en: 'English',
  pseudo: 'Pseudo (reversed)'
} as const;

export type Locale = keyof typeof LOCALES;
