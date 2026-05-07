'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { FilmSupplierActivity, FilmSupplierFormatStats } from '@frollz2/schema';
import { useTranslation } from '@frollz2/i18n';
import { useSession } from '../../auth/session';
import { resolveApiError } from '../../utils/resolve-api-error';
import { emulsionLabel, formatDate, formatMoney } from '../../utils/format';
import { PageHeader } from '../PageHeader';

function StatTile({ label, value, helper }: { label: string | number; value: string | number; helper: string }) {
  return (
    <section className="card" style={{ margin: 0 }}>
      <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <h2 style={{ margin: '8px 0 4px', fontSize: 15 }}>{label}</h2>
      <p style={{ margin: 0, color: 'var(--muted-ink)', fontSize: 13 }}>{helper}</p>
    </section>
  );
}

function typicalPrice(rows: Array<{ currencyCode: string; medianAmount: number }>): string {
  return rows.map((row) => `${formatMoney(row.medianAmount, row.currencyCode)} typical`).join(', ') || '—';
}

function totalUnits(rows: FilmSupplierFormatStats[]): number {
  return rows.reduce((sum, row) => sum + row.totalUnitsPurchased, 0);
}

export function FilmSupplierDetailPage() {
  const { t } = useTranslation();
  const { api } = useSession();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [data, setData] = useState<FilmSupplierActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setError('Invalid film supplier id');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getFilmSupplierActivity(id)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(resolveApiError(err, t, 'Failed to load film supplier activity')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, id, t]);

  const unitsPurchased = useMemo(() => totalUnits(data?.formatStats ?? []), [data]);

  return (
    <main>
      <PageHeader
        heading={data?.supplier.name ?? 'Film Supplier'}
        subtitle="Purchase history and typical cost by format."
        action={<Link href="/admin/film-suppliers" className="button-link">Back to suppliers</Link>}
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      {isLoading || !data ? (
        <section className="card"><div className="skeleton skeleton-row" /></section>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatTile label="Purchases" value={data.purchases.length} helper="Film lots bought here" />
            <StatTile label="Units" value={unitsPurchased} helper="Rolls, packs, or sheets purchased" />
            <StatTile label="Formats" value={data.formatStats.length} helper="Formats with purchase history" />
          </div>

          <section className="card">
            <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Purchase history</h2>
            {data.purchases.length === 0 ? (
              <div className="empty-state"><p>No purchase history for this supplier yet.</p></div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Film</th>
                      <th>Format</th>
                      <th>Package</th>
                      <th>Quantity</th>
                      <th>Purchased</th>
                      <th>Total price</th>
                      <th>Unit price</th>
                      <th>Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchases.map((purchase) => (
                      <tr key={purchase.filmLotId}>
                        <td>{emulsionLabel(purchase.emulsion)}</td>
                        <td>{purchase.filmFormat.label}</td>
                        <td>{purchase.packageType.label}</td>
                        <td>{purchase.quantity}</td>
                        <td>{formatDate(purchase.purchasedAt)}</td>
                        <td>{purchase.price ? formatMoney(purchase.price.amount, purchase.price.currencyCode) : '—'}</td>
                        <td>{purchase.unitPrice ? formatMoney(purchase.unitPrice.amount, purchase.unitPrice.currencyCode) : '—'}</td>
                        <td>{purchase.orderRef ?? purchase.channel ?? '—'}</td>
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
              <div className="empty-state"><p>No purchase history yet.</p></div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Format</th>
                      <th>Purchases</th>
                      <th>Units</th>
                      <th>Typical package</th>
                      <th>Typical unit</th>
                      <th>Last purchase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.formatStats.map((row) => (
                      <tr key={row.filmFormat.id}>
                        <td>{row.filmFormat.label}</td>
                        <td>{row.purchaseCount}</td>
                        <td>{row.totalUnitsPurchased}</td>
                        <td>{typicalPrice(row.packagePriceByCurrency)}</td>
                        <td>{typicalPrice(row.unitPriceByCurrency)}</td>
                        <td>{formatDate(row.lastPurchaseDate)}</td>
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
