'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buildFilmDashboardOverview, type FilmDashboardOverviewCard } from '@frollz2/contracts';
import type { DashboardInsights } from '@frollz2/schema';
import { useTranslation } from '@frollz2/i18n';
import { useSession } from '../auth/session';
import { PageHeader } from './PageHeader';
import { resolveApiError } from '../utils/resolve-api-error';
import { DashboardInsightCards } from './domains/InsightsPages';

type ProgressRowProps = { label: string; value: number; max: number; color: string };
function ProgressRow({ label, value, max, color }: ProgressRowProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted-ink)' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{value}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        style={{ height: 6, borderRadius: 999, background: 'var(--border)' }}
      >
        <div style={{ height: 6, borderRadius: 999, background: color, width: `${pct}%`, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

const CARD_COLORS: string[][] = [
  ['#c49a3c', '#c45c3c', '#5e5851', '#9da0a6'],
  ['#45403c', '#169d9b', '#9da0a6', '#b1b4b9'],
  ['#9da0a6', '#c49a3c', '#b1b4b9', '#57524d'],
  ['#c15c3c', '#8f9399', '#b1b4b9', '#57524d']
];

function StatCard({
  card,
  colorIndex
}: { card: FilmDashboardOverviewCard; colorIndex: number }) {
  const colors: string[] = CARD_COLORS[colorIndex % CARD_COLORS.length] ?? ['#c49a3c', '#c45c3c', '#5e5851', '#9da0a6'];
  const max = Math.max(...card.segments.map((r) => r.value), 1);

  return (
    <section style={{
      borderRadius: 16,
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 0
    }}>
      <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, color: 'var(--ink)' }}>{card.value}</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginTop: 4 }}>{card.title}</div>
      <div style={{ fontSize: 14, color: 'var(--muted-ink)', marginBottom: 16, marginTop: 2 }}>{card.helper}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {card.segments.map((row, i) => (
          <ProgressRow key={row.label} label={row.label} value={row.value} max={max} color={colors[i % colors.length] ?? '#57524d'} />
        ))}
      </div>

      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <Link href={card.actionHref} className="button-link" style={{ borderRadius: 10, fontSize: 14 }}>
          {card.actionLabel}
        </Link>
      </div>
    </section>
  );
}

export function DashboardView() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { api } = useSession();
  const [cards, setCards] = useState<FilmDashboardOverviewCard[]>([]);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [films, dashboardInsights] = await Promise.all([
          api.getFilms(),
          api.getDashboardInsights({ limit: 3 })
        ]);
        const now = Date.now();
        const latestEventsByFilmId: Record<number, { occurredAt: string } | null> = {};
        films.items.forEach((film) => {
          latestEventsByFilmId[film.id] = film.latestEvent ? { occurredAt: film.latestEvent.occurredAt } : null;
        });
        setCards(buildFilmDashboardOverview(films.items, latestEventsByFilmId, now, { t: (key, opts) => t(key, opts ?? {}) }));
        setInsights(dashboardInsights);
      } catch (err) {
        setError(resolveApiError(err, t, t('dashboard.failedToLoad')));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [api, t]);

  return (
    <main>
      <PageHeader
        heading={t('dashboard.heading')}
        subtitle={t('dashboard.subtitle')}
        action={
          <span style={{ fontSize: 14, color: 'var(--muted-ink)' }}>
            {user?.name ?? t('dashboard.photographerFallback')}
          </span>
        }
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      {isLoading ? (
        <div aria-busy="true" aria-label={t('dashboard.loadingLabel')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 240, borderRadius: 16 }} />
          ))}
        </div>
      ) : (
        <>
          {insights ? <DashboardInsightCards insights={insights} /> : null}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {cards.map((card, index) => (
              <StatCard key={card.key} card={card} colorIndex={index} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
