'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type {
  DashboardInsights,
  DeviceUsageInsights,
  FilmWorkflowInsights,
  InsightRange
} from '@frollz2/schema';
import { useSession } from '../../auth/session';
import { emulsionLabel, formatDate, formatMoney } from '../../utils/format';
import { RANGE_OPTIONS, RangeToolbar } from '../RangeToolbar';
import { PageHeader } from '../PageHeader';

function StatTile({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <section className="card" style={{ margin: 0 }}>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <h2 style={{ margin: '8px 0 4px', fontSize: 15 }}>{label}</h2>
      <p style={{ margin: 0, color: 'var(--muted-ink)', fontSize: 13 }}>{helper}</p>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="empty-state"><p>{message}</p></div>;
}

function resolveStatsError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function FilmStatsPage() {
  const { api } = useSession();
  const [range, setRange] = useState<InsightRange>('365d');
  const [data, setData] = useState<FilmWorkflowInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getFilmInsights({ range })
      .then(setData)
      .catch((err) => setError(resolveStatsError(err, 'Failed to load film stats')))
      .finally(() => setLoading(false));
  }, [api, range]);

  return (
    <main>
      <PageHeader heading="Film Stats" subtitle="Workflow bottlenecks by format and development process." />
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      <RangeToolbar range={range} onRangeChange={setRange} />
      {isLoading || !data ? (
        <section className="card"><div className="skeleton skeleton-row" /></section>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatTile label="Removed, not sent" value={data.totals.removedNotSent} helper="Waiting to go to a lab" />
            <StatTile label="At lab" value={data.totals.atLab} helper="Current development queue" />
            <StatTile label="Recent completions" value={data.totals.recentCompletions} helper={`Developed in ${RANGE_OPTIONS.find((r) => r.value === range)?.label.toLowerCase()}`} />
            <StatTile label="Active film" value={data.totals.activeFilms} helper={`${data.totals.totalFilms} total tracked`} />
          </div>
          <section className="card">
            <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Oldest waiting items</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <StatTile
                label="Removed"
                value={data.oldestWaitingFilm ? `${data.oldestWaitingFilm.daysWaiting}d` : '—'}
                helper={data.oldestWaitingFilm ? data.oldestWaitingFilm.filmName : 'No removed film waiting'}
              />
              <StatTile
                label="Lab queue"
                value={data.oldestLabQueueItem ? `${data.oldestLabQueueItem.daysWaiting}d` : '—'}
                helper={data.oldestLabQueueItem ? `${data.oldestLabQueueItem.labName ?? 'Unknown lab'} · ${data.oldestLabQueueItem.filmName}` : 'No film at lab'}
              />
            </div>
          </section>
          <section className="card">
            <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Breakdowns</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <InsightList title="By format" rows={data.byFormat} />
              <InsightList title="By process" rows={data.byDevelopmentProcess} />
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function InsightList({ title, rows }: { title: string; rows: Array<{ key: string; label: string; count: number }> }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>{title}</h3>
      {rows.length === 0 ? <EmptyState message="No data yet." /> : (
        <table>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function DeviceStatsPage() {
  const { api } = useSession();
  const [range, setRange] = useState<InsightRange>('365d');
  const [data, setData] = useState<DeviceUsageInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getDeviceInsights({ range, limit: 50 })
      .then(setData)
      .catch((err) => setError(resolveStatsError(err, 'Failed to load device stats')))
      .finally(() => setLoading(false));
  }, [api, range]);

  return (
    <main>
      <PageHeader heading="Device Stats" subtitle="A lightweight usage snapshot for cameras, backs, and holders." />
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      <RangeToolbar range={range} onRangeChange={setRange} />
      {data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatTile label="Devices" value={data.totalDevices} helper="Tracked bodies, backs, and holders" />
          <StatTile label="Active loads" value={data.activeLoads} helper="Currently loaded or exposed" />
        </div>
      ) : null}
      <section className="card">
        {isLoading || !data ? <div className="skeleton skeleton-row" /> : data.rows.length === 0 ? <EmptyState message="No devices yet." /> : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Type</th>
                  <th>Format</th>
                  <th>Loads</th>
                  <th>Active</th>
                  <th>Last loaded</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.deviceId}>
                    <td><Link href={`/devices/${row.deviceId}`}>{row.deviceName}</Link></td>
                    <td>{row.deviceTypeCode.replace(/_/g, ' ')}</td>
                    <td>{row.filmFormat.label}</td>
                    <td>{row.loadCount}</td>
                    <td>{row.activeLoadCount}</td>
                    <td>{formatDate(row.lastLoadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export function DashboardInsightCards({ insights }: { insights: DashboardInsights }) {
  const cards = [
    {
      title: 'Slowest lab queue',
      value: insights.slowestLabQueue ? `${insights.slowestLabQueue.daysWaiting}d` : '—',
      helper: insights.slowestLabQueue ? `${insights.slowestLabQueue.labName ?? 'Unknown lab'} · ${insights.slowestLabQueue.developmentProcess.label}` : 'No active lab queue',
      href: insights.slowestLabQueue?.labId ? `/admin/film-labs/${insights.slowestLabQueue.labId}` : '/admin/film-labs'
    },
    {
      title: 'Best recent film price',
      value: insights.bestRecentPrice ? formatMoney(insights.bestRecentPrice.lowestUnitPrice, insights.bestRecentPrice.currencyCode) : '—',
      helper: insights.bestRecentPrice ? `${emulsionLabel(insights.bestRecentPrice.emulsion)} · ${insights.bestRecentPrice.packageType.label}` : 'No priced purchases',
      href: insights.bestRecentPrice?.bestSupplier
        ? `/admin/film-suppliers/${insights.bestRecentPrice.bestSupplier.supplierId}`
        : '/admin/film-suppliers'
    },
    {
      title: 'Workflow bottleneck',
      value: insights.workflowBottleneck?.count ?? '—',
      helper: insights.workflowBottleneck?.label ?? 'No current bottleneck',
      href: insights.workflowBottleneck?.href ?? '/film'
    }
  ];

  return (
    <section style={{ marginBottom: 18 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Insights</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {cards.map((card) => (
          <Link key={card.title} href={card.href} className="card" style={{ margin: 0, color: 'inherit', textDecoration: 'none' }}>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{card.value}</div>
            <h3 style={{ margin: '8px 0 4px', fontSize: 15 }}>{card.title}</h3>
            <p style={{ margin: 0, color: 'var(--muted-ink)', fontSize: 13 }}>{card.helper}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
