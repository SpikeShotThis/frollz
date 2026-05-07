import { Text, View } from 'react-native';
import { buildFilmKpis, type FilmListItem } from '@frollz2/contracts';
import { tokens } from '@frollz2/design-tokens';
import '@frollz2/i18n';
import { useTranslation } from '@frollz2/i18n';

const sampleFilms: FilmListItem[] = [
  {
    id: 1,
    name: 'Portra 400 Roll A',
    expirationDate: '2026-07-01T00:00:00.000Z',
    currentStateCode: 'sent_for_dev',
    currentState: { label: 'Sent for development' },
    emulsion: { manufacturer: 'Kodak', brand: 'Portra', isoSpeed: 400 },
    filmFormat: { code: '35mm' }
  },
  {
    id: 2,
    name: 'Delta 3200 Roll B',
    expirationDate: null,
    currentStateCode: 'exposed',
    currentState: { label: 'Exposed' },
    emulsion: { manufacturer: 'Ilford', brand: 'Delta', isoSpeed: 3200 },
    filmFormat: { code: '35mm' }
  }
];

const kpis = buildFilmKpis(sampleFilms, Date.now());

export default function MobileHomePage() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.background, padding: tokens.spacing.xl, gap: tokens.spacing.md }}>
      <Text style={{ color: tokens.colors.accent, fontSize: 12, letterSpacing: 1.2 }}>{t('mobile.migrationBaseline')}</Text>
      <Text style={{ color: tokens.colors.ink, fontSize: 32, fontWeight: '700' }}>{t('mobile.appName')}</Text>
      {kpis.map((kpi) => (
        <View
          key={kpi.label}
          style={{
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.border,
            borderWidth: 1,
            borderRadius: tokens.radius.lg,
            padding: tokens.spacing.lg
          }}
        >
          <Text style={{ color: tokens.colors.ink, fontSize: 18, fontWeight: '600' }}>{kpi.label}</Text>
          <Text style={{ color: tokens.colors.ink, fontSize: 28, marginTop: tokens.spacing.sm }}>{kpi.value}</Text>
          <Text style={{ color: tokens.colors.mutedInk, marginTop: tokens.spacing.xs }}>{kpi.helper}</Text>
        </View>
      ))}
    </View>
  );
}
