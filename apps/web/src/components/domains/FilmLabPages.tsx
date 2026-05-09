'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { FilmLabActivity, FilmLabFormatStats } from '@frollz2/schema';
import { useTranslation } from '@frollz2/i18n';
import { useSession } from '../../auth/session';
import { resolveApiError } from '../../utils/resolve-api-error';
import { emulsionLabel, formatDate, formatMoney } from '../../utils/format';
import { PageHeader } from '../PageHeader';

function StatTile({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <section className="card" style={{ margin: 0 }}>
      <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <h2 style={{ margin: '8px 0 4px', fontSize: 15 }}>{label}</h2>
      <p style={{ margin: 0, color: 'var(--muted-ink)', fontSize: 13 }}>{helper}</p>
    </section>
  );
}

function typicalCost(stats: FilmLabFormatStats): string {
  return stats.typicalCostByCurrency
    .map((cost) => `${formatMoney(cost.medianAmount, cost.currencyCode)} typical`)
    .join(', ') || '—';
}

function weightedAverageTurnaround(rows: FilmLabFormatStats[]): number | null {
  let totalDays = 0;
  let totalCompleted = 0;
  for (const row of rows) {
    if (row.averageTurnaroundDays === null || row.completedCount === 0) continue;
    totalDays += row.averageTurnaroundDays * row.completedCount;
    totalCompleted += row.completedCount;
  }
  return totalCompleted > 0 ? Math.round((totalDays / totalCompleted) * 10) / 10 : null;
}

export function FilmLabDetailPage() {
  const { t } = useTranslation();
  const { api } = useSession();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [data, setData] = useState<FilmLabActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setError('Invalid film lab id');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getFilmLabActivity(id)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(resolveApiError(err, t, 'Failed to load film lab activity')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, id, t]);

  const averageTurnaround = useMemo(() => weightedAverageTurnaround(data?.formatStats ?? []), [data]);

  return (
    <main>
      <PageHeader
        heading={data?.lab.name ?? 'Film Lab'}
        subtitle="Current drop-offs, turnaround, and cost by format."
        action={<Link href="/admin/film-labs" className="button-link">Back to labs</Link>}
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      {isLoading || !data ? (
        <section className="card"><div className="skeleton skeleton-row" /></section>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatTile label="At lab" value={data.activeFilms.length} helper="Film currently dropped off here" />
            <StatTile label="Avg turnaround" value={averageTurnaround === null ? '—' : `${averageTurnaround}d`} helper="Completed rolls and sheets" />
            <StatTile label="Formats" value={data.formatStats.length} helper="Formats with lab history" />
          </div>

          <section className="card">
            <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Currently dropped off</h2>
            {data.activeFilms.length === 0 ? (
              <div className="empty-state"><p>No film is currently dropped off at this lab.</p></div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Film</th>
                      <th>Format</th>
                      <th>Stock</th>
                      <th>Process</th>
                      <th>Dropped off</th>
                      <th>Waiting</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activeFilms.map((film) => (
                      <tr key={film.filmId}>
                        <td><Link href={`/film/${film.filmId}`}>{film.filmName}</Link></td>
                        <td>{film.filmFormat.label}</td>
                        <td>{emulsionLabel(film.emulsion)}</td>
                        <td>{film.developmentProcess.label}</td>
                        <td>{formatDate(film.sentAt)}</td>
                        <td>{film.daysWaiting}d</td>
                        <td>{film.cost ? formatMoney(film.cost.amount, film.cost.currencyCode) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>By format</h2>
            {data.formatStats.length === 0 ? (
              <div className="empty-state"><p>No lab history yet.</p></div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Format</th>
                      <th>At lab</th>
                      <th>Completed</th>
                      <th>Average turnaround</th>
                      <th>Typical cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.formatStats.map((row) => (
                      <tr key={row.filmFormat.id}>
                        <td>{row.filmFormat.label}</td>
                        <td>{row.activeQueueCount}</td>
                        <td>{row.completedCount}</td>
                        <td>{row.averageTurnaroundDays === null ? '—' : `${row.averageTurnaroundDays}d`}</td>
                        <td>{typicalCost(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
