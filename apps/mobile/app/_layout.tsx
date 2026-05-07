import { Stack } from 'expo-router';
import { useTranslation } from '@frollz2/i18n';

export default function RootLayout() {
  const { t } = useTranslation();
  return <Stack screenOptions={{ headerTitle: t('mobile.headerTitle') }} />;
}
