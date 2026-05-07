'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type {
  DashboardInsights,
  DeviceUsageInsights,
  FilmWorkflowInsights,
  InsightRange,
  LabPerformanceInsights,
  SupplierPerformanceInsights
} from '@frollz2/schema';
import { useSession } from '../../auth/session';
import { PageHeader } from '../PageHeader';

type RangeState = InsightRange;

const RANGE_OPTIONS: Array<{ value: RangeState; label: string }> = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '365d', label: '365 days' },
  { value: 'all', label: 'All time' }
];

function StatTile({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <section className="card" style={{ margin: 0 }}>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <h2 style={{ margin: '8px 0 4px', fontSize: 15 }}>{label}</h2>
      <p style={{ margin: 0, color: 'var(--muted-ink)', fontSize: 13 }}>{helper}</p>
    </section>
  );
}

function RangeToolbar({ range, onRangeChange }: { range: RangeState; onRangeChange: (range: RangeState) => void }) {
  return (
    <section className="card">
      <div className="form-field" style={{ marginBottom: 0, maxWidth: 220 }}>
        <label htmlFor="insights-range">Range</label>
        <select id="insights-range" value={range} onChange={(event) => onRangeChange(event.target.value as RangeState)}>
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </section>
  );
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
}

function emulsionLabel(row: { manufacturer: string; brand: string; isoSpeed: number }) {
  return `${row.manufacturer} ${row.brand} ${row.isoSpeed}`;
}

function EmptyState({ message }: { message: string }) {
  return <div className="empty-state"><p>{message}</p></div>;
}

function resolveStatsError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function FilmStatsPage() {
  const { api } = useSession();
  const [range, setRange] = useState<RangeState>('365d');
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

export function LabStatsPage() {
  const { api } = useSession();
  const [range, setRange] = useState<RangeState>('365d');
  const [data, setData] = useState<LabPerformanceInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getLabInsights({ range, limit: 50 })
      .then(setData)
      .catch((err) => setError(resolveStatsError(err, 'Failed to load lab stats')))
      .finally(() => setLoading(false));
  }, [api, range]);

  return (
    <main>
      <PageHeader heading="Lab Stats" subtitle="Turnaround and cost grouped by lab and development process." />
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      <RangeToolbar range={range} onRangeChange={setRange} />
      <section className="card">
        {isLoading || !data ? <div className="skeleton skeleton-row" /> : data.rows.length === 0 ? <EmptyState message="No lab history yet." /> : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Lab</th>
                  <th>Process</th>
                  <th>Completed</th>
                  <th>Active</th>
                  <th>Median TAT</th>
                  <th>Cost</th>
                  <th>Last used</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={`${row.labId}-${row.developmentProcess.id}`}>
                    <td>{row.labName}</td>
                    <td>{row.developmentProcess.label}</td>
                    <td>{row.completedCount}</td>
                    <td>{row.activeQueueCount}</td>
                    <td>{row.medianTurnaroundDays == null ? '—' : `${row.medianTurnaroundDays}d`}</td>
                    <td>{row.developmentCostByCurrency.map((cost) => `${formatMoney(cost.medianAmount, cost.currencyCode)} med`).join(', ') || '—'}</td>
                    <td>{formatDate(row.lastUsedAt)}</td>
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

export function SupplierStatsPage() {
  const { api } = useSession();
  const [range, setRange] = useState<RangeState>('365d');
  const [data, setData] = useState<SupplierPerformanceInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getSupplierInsights({ range, limit: 50 })
      .then(setData)
      .catch((err) => setError(resolveStatsError(err, 'Failed to load supplier stats')))
      .finally(() => setLoading(false));
  }, [api, range]);

  return (
    <main>
      <PageHeader heading="Supplier Stats" subtitle="Film prices grouped by emulsion, package, format, and currency." />
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      <RangeToolbar range={range} onRangeChange={setRange} />
      <section className="card">
        {isLoading || !data ? <div className="skeleton skeleton-row" /> : data.rows.length === 0 ? <EmptyState message="No priced purchase history yet." /> : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Film</th>
                  <th>Lowest package</th>
                  <th>Median package</th>
                  <th>Lowest unit</th>
                  <th>Best supplier</th>
                  <th>Purchases</th>
                  <th>Last purchase</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={`${row.emulsion.id}-${row.packageType.id}-${row.filmFormat.id}-${row.currencyCode}`}>
                    <td>
                      <strong>{emulsionLabel(row.emulsion)}</strong>
                      <div style={{ color: 'var(--muted-ink)', fontSize: 13 }}>{row.filmFormat.label} · {row.packageType.label}</div>
                    </td>
                    <td>{formatMoney(row.lowestPackagePrice, row.currencyCode)}</td>
                    <td>{formatMoney(row.medianPackagePrice, row.currencyCode)}</td>
                    <td>{formatMoney(row.lowestUnitPrice, row.currencyCode)}</td>
                    <td>{row.bestSupplier?.supplierName ?? '—'}</td>
                    <td>{row.purchaseCount} / {row.totalUnitsPurchased} units</td>
                    <td>{formatDate(row.lastPurchaseDate)}</td>
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

export function DeviceStatsPage() {
  const { api } = useSession();
  const [range, setRange] = useState<RangeState>('365d');
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
      href: '/admin/film-labs/stats'
    },
    {
      title: 'Best recent film price',
      value: insights.bestRecentPrice ? formatMoney(insights.bestRecentPrice.lowestUnitPrice, insights.bestRecentPrice.currencyCode) : '—',
      helper: insights.bestRecentPrice ? `${emulsionLabel(insights.bestRecentPrice.emulsion)} · ${insights.bestRecentPrice.packageType.label}` : 'No priced purchases',
      href: '/admin/film-suppliers/stats'
    },
    {
      title: 'Workflow bottleneck',
      value: insights.workflowBottleneck?.count ?? '—',
      helper: insights.workflowBottleneck?.label ?? 'No current bottleneck',
      href: insights.workflowBottleneck?.href ?? '/film/stats'
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
