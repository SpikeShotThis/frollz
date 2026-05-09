'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslation } from '@frollz2/i18n';
import { LIST_MAX_LIMIT, filmCreateRequestSchema, filmUpdateRequestSchema } from '@frollz2/schema';
import type { Emulsion, FilmDetail, FilmFormat, FilmFrame, FilmJourneyEvent, FilmState, FilmSummary, FilmSupplier, FilmWorkflowInsights, InsightRange, PackageType, ReferenceTables } from '@frollz2/schema';
import type { FilmListQuery } from '@frollz2/api-client';
import { useSession } from '../../auth/session';
import { FormDrawer } from '../FormDrawer';
import { PageHeader } from '../PageHeader';
import { StateBadge } from '../StateBadge';
import { FilmEventForm } from '../FilmEventForm';
import { FrameEditor } from '../FrameEditor';
import { formatCost, formatKnownCost } from '../../utils/filmCost';
import { useIdempotentSubmit } from '../../hooks/useIdempotentSubmit';
import { resolveApiError } from '../../utils/resolve-api-error';
import { formatDate, toTitleCase } from '../../utils/format';
import { RangeToolbar } from '../RangeToolbar';

function toIsoFromDateInput(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const FILM_FORMAT_ROUTES = {
  '35mm': { href: '/film/35mm', codes: ['35mm'], labelKey: 'navigation.film35mm' },
  'medium-format': { href: '/film/medium-format', codes: ['120'], labelKey: 'navigation.filmMediumFormat' },
  'large-format': { href: '/film/large-format', codes: ['4x5', '5x7', '8x10', '11x14'], labelKey: 'navigation.filmLargeFormat' },
  instant: { href: '/film/instant', codes: ['InstaxMini', 'InstaxWide', 'InstaxSquare'], labelKey: 'navigation.filmInstant' }
} as const;

export type FilmFormatRouteKey = keyof typeof FILM_FORMAT_ROUTES;

const FORMAT_FILTER_CODES: Record<FilmFormatRouteKey, string[]> = {
  '35mm': [...FILM_FORMAT_ROUTES['35mm'].codes],
  'medium-format': [...FILM_FORMAT_ROUTES['medium-format'].codes],
  'large-format': [...FILM_FORMAT_ROUTES['large-format'].codes],
  instant: [...FILM_FORMAT_ROUTES.instant.codes]
};

const STATE_METER_COLORS = ['#c49a3c', '#169d9b', '#c15c3c', '#5e5851', '#8f9399', '#57524d', '#b1b4b9', '#7b8c60'];

type MeterValue = {
  key: string;
  label: string;
  value: number;
  color: string;
};

function FilmStateMeterGroup({
  title,
  href,
  values
}: {
  title: string;
  href: string;
  values: MeterValue[];
}) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const visibleValues = values.filter((item) => item.value > 0);

  return (
    <section className="card" style={{ margin: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted-ink)', fontSize: 13 }}>{total} films</p>
        </div>
        <Link href={href} className="button-link" style={{ fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }}>Open</Link>
      </div>

      <div
        role="meter"
        aria-label={`${title} film states`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={total}
        style={{
          display: 'flex',
          height: 16,
          overflow: 'hidden',
          borderRadius: 999,
          background: 'var(--border)'
        }}
      >
        {visibleValues.length > 0 ? visibleValues.map((item) => (
          <div
            key={item.key}
            title={`${item.label}: ${item.value}`}
            style={{
              width: `${(item.value / total) * 100}%`,
              minWidth: item.value > 0 ? 3 : 0,
              background: item.color
            }}
          />
        )) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 14 }}>
        {values.map((item) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: item.color, flex: '0 0 auto' }} />
            <span style={{ color: 'var(--muted-ink)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            <strong style={{ marginLeft: 'auto', fontSize: 13 }}>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}


export function FilmDashboardPage() {
  const { t } = useTranslation();
  const { api } = useSession();
  const [films, setFilms] = useState<FilmSummary[]>([]);
  const [states, setStates] = useState<FilmState[]>([]);
  const [formats, setFormats] = useState<FilmFormat[]>([]);
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const [emulsions, setEmulsions] = useState<Emulsion[]>([]);
  const [suppliers, setSuppliers] = useState<FilmSupplier[]>([]);
  const [range, setRange] = useState<InsightRange>('365d');
  const [stats, setStats] = useState<FilmWorkflowInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    emulsionId: '',
    packageTypeId: '',
    filmFormatId: '',
    expirationDate: '',
    supplierInput: '',
    purchaseChannel: '',
    purchasePrice: '',
    purchaseCurrencyCode: 'USD',
    purchaseOrderRef: '',
    purchaseObtainedDate: todayLocalDate(),
    rating: ''
  });
  const {
    beginSubmit: beginCreateSubmit,
    endSubmit: endCreateSubmit,
    idempotencyKeyRef: createIdempotencyKeyRef,
    isSubmitting: isCreatingFilm,
    resetSubmit: resetCreateSubmit
  } = useIdempotentSubmit();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchAllFilms = async () => {
          const items: FilmSummary[] = [];
          let afterId: number | undefined;

          do {
            const response = await api.getFilms({ limit: LIST_MAX_LIMIT, ...(afterId ? { afterId } : {}) });
            items.push(...response.items);
            afterId = response.nextCursor ?? undefined;
          } while (afterId);

          return items;
        };

        const [items, refs, ems, sups, insights] = await Promise.all([
          fetchAllFilms(),
          api.getReferenceTables(),
          api.getEmulsions(),
          api.getFilmSuppliers({ limit: LIST_MAX_LIMIT }),
          api.getFilmInsights({ range })
        ]);
        setFilms(items);
        setStates(refs.filmStates);
        setFormats(refs.filmFormats);
        setPackageTypes(refs.packageTypes);
        setEmulsions(ems);
        setSuppliers(sups);
        setStats(insights);
      } catch (err) {
        setError(resolveApiError(err, t, t('film.failedToLoad')));
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [api, range, t]);

  useEffect(() => {
    if (!isCreateOpen) {
      resetCreateSubmit();
    }
  }, [isCreateOpen, resetCreateSubmit]);

  const selectedFormatId = form.filmFormatId ? Number(form.filmFormatId) : null;
  const packageTypeOptions = selectedFormatId
    ? packageTypes.filter((pkg) => pkg.filmFormatId === selectedFormatId)
    : [];
  const emulsionOptions = selectedFormatId
    ? emulsions.filter((emulsion) => emulsion.filmFormats.some((fmt) => fmt.id === selectedFormatId))
    : [];

  const formatMeters = useMemo(() => {
    return (Object.entries(FILM_FORMAT_ROUTES) as Array<[FilmFormatRouteKey, typeof FILM_FORMAT_ROUTES[FilmFormatRouteKey]]>).map(([key, route]) => {
      const codes: readonly string[] = route.codes;
      const formatFilms = films.filter((film) => codes.includes(film.filmFormat.code));
      const stateValues = states.map((state, index) => ({
        key: state.code,
        label: state.label,
        value: formatFilms.filter((film) => film.currentStateCode === state.code).length,
        color: STATE_METER_COLORS[index % STATE_METER_COLORS.length] ?? '#8f9399'
      }));
      return {
        key,
        href: route.href,
        label: t(route.labelKey),
        values: stateValues
      };
    });
  }, [films, states, t]);

  return (
    <main>
      <PageHeader
        heading={t('navigation.film')}
        subtitle={t('film.dashboardSubtitle')}
        action={
          <button type="button" onClick={() => setCreateOpen(true)}>{t('film.addFilm')}</button>
        }
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      <RangeToolbar range={range} onRangeChange={setRange} id="film-dashboard-range" />

      {isLoading ? (
        <div aria-busy="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}
        </div>
      ) : (
        <>
          <section style={{ marginBottom: 18 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>{t('film.dashboardFormatsHeading')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {formatMeters.map((format) => (
                <FilmStateMeterGroup key={format.key} title={format.label} href={format.href} values={format.values} />
              ))}
            </div>
          </section>

          {stats ? (
            <section className="card">
              <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>{t('film.dashboardWorkflowHeading')}</h2>
              <div className="table-scroll">
                <table>
                  <tbody>
                    <tr>
                      <td>{t('film.dashboardStats.removedNotSent')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{stats.totals.removedNotSent}</td>
                    </tr>
                    <tr>
                      <td>{t('film.dashboardStats.atLab')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{stats.totals.atLab}</td>
                    </tr>
                    <tr>
                      <td>{t('film.dashboardStats.recentCompletions')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{stats.totals.recentCompletions}</td>
                    </tr>
                    <tr>
                      <td>{t('film.dashboardStats.oldestRemoved')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {stats.oldestWaitingFilm ? `${stats.oldestWaitingFilm.daysWaiting}d · ${stats.oldestWaitingFilm.filmName}` : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td>{t('film.dashboardStats.oldestLabQueue')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {stats.oldestLabQueueItem
                          ? `${stats.oldestLabQueueItem.daysWaiting}d · ${stats.oldestLabQueueItem.labName ?? 'Unknown lab'} · ${stats.oldestLabQueueItem.filmName}`
                          : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 18 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>{t('film.dashboardStats.byProcess')}</h3>
                {stats.byDevelopmentProcess.length === 0 ? (
                  <div className="empty-state"><p>{t('film.dashboardStats.noProcessData')}</p></div>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <tbody>
                        {stats.byDevelopmentProcess.map((row) => (
                          <tr key={row.key}>
                            <td>{row.label}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <p style={{ margin: '12px 0 0', color: 'var(--muted-ink)', fontSize: 13 }}>
                {t('film.dashboardStats.generatedAt', { date: formatDate(stats.generatedAt) })}
              </p>
            </section>
          ) : null}
        </>
      )}

      <FormDrawer open={isCreateOpen} onClose={() => setCreateOpen(false)} title={t('film.addFilmDrawerTitle')}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!beginCreateSubmit()) return;
          setError(null);
          try {
            const payload = filmCreateRequestSchema.parse({
              name: form.name,
              emulsionId: Number(form.emulsionId),
              packageTypeId: Number(form.packageTypeId),
              filmFormatId: Number(form.filmFormatId),
              expirationDate: toIsoFromDateInput(form.expirationDate),
              supplierName: (() => {
                const supplierName = form.supplierInput.trim();
                if (!supplierName) return undefined;
                const existing = suppliers.find((s) => s.name.toLowerCase() === supplierName.toLowerCase());
                return existing ? undefined : supplierName;
              })(),
              purchaseInfo: (() => {
                const supplierName = form.supplierInput.trim();
                const existing = supplierName
                  ? suppliers.find((s) => s.name.toLowerCase() === supplierName.toLowerCase())
                  : undefined;
                const channel = form.purchaseChannel.trim();
                const price = form.purchasePrice.trim();
                const currencyCode = form.purchaseCurrencyCode.trim().toUpperCase();
                const orderRef = form.purchaseOrderRef.trim();
                const obtainedDate = toIsoFromDateInput(form.purchaseObtainedDate);
                const hasPurchaseInfo = Boolean(existing || supplierName || channel || price || currencyCode || orderRef || obtainedDate);
                return hasPurchaseInfo
                  ? {
                      supplierId: existing?.id,
                      channel: channel || null,
                      price: price ? Number(price) : null,
                      currencyCode: currencyCode || null,
                      orderRef: orderRef || null,
                      obtainedDate
                    }
                  : undefined;
              })(),
              rating: form.rating ? Number(form.rating) : undefined
            });
            await api.createFilm(payload, createIdempotencyKeyRef.current);
            setForm({
              name: '',
              emulsionId: '',
              packageTypeId: '',
              filmFormatId: '',
              expirationDate: '',
              supplierInput: '',
              purchaseChannel: '',
              purchasePrice: '',
              purchaseCurrencyCode: 'USD',
              purchaseOrderRef: '',
              purchaseObtainedDate: todayLocalDate(),
              rating: ''
            });
            const fetchAllFilms = async () => {
              const items: FilmSummary[] = [];
              let afterId: number | undefined;
              do {
                const response = await api.getFilms({ limit: LIST_MAX_LIMIT, ...(afterId ? { afterId } : {}) });
                items.push(...response.items);
                afterId = response.nextCursor ?? undefined;
              } while (afterId);
              return items;
            };
            setFilms(await fetchAllFilms());
            setCreateOpen(false);
          } catch (err) {
            setError(resolveApiError(err, t, t('film.failedToCreate')));
          } finally {
            endCreateSubmit();
          }
        }}>
          <fieldset disabled={isCreatingFilm} style={{ margin: 0, padding: 0, border: 'none' }}>
            <legend className="sr-only">{t('film.form.newLegend')}</legend>
            <div className="form-field">
              <label htmlFor="new-film-name">{t('film.form.name')}</label>
              <input id="new-film-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label htmlFor="new-film-format">{t('film.form.format')}</label>
              <select
                id="new-film-format"
                value={form.filmFormatId}
                onChange={(e) => setForm((prev) => ({ ...prev, filmFormatId: e.target.value, emulsionId: '', packageTypeId: '' }))}
                required
              >
                <option value="">{t('film.form.selectFormat')}</option>
                {formats.map((fmt) => <option key={fmt.id} value={fmt.id}>{fmt.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="new-film-package-type">{t('film.form.packageType')}</label>
              <select id="new-film-package-type" value={form.packageTypeId} onChange={(e) => setForm((prev) => ({ ...prev, packageTypeId: e.target.value }))} required disabled={!form.filmFormatId}>
                <option value="">{t('film.form.selectPackageType')}</option>
                {packageTypeOptions.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="new-film-emulsion">{t('film.form.emulsion')}</label>
              <select id="new-film-emulsion" value={form.emulsionId} onChange={(e) => setForm((prev) => ({ ...prev, emulsionId: e.target.value }))} required disabled={!form.filmFormatId}>
                <option value="">{t('film.form.selectEmulsion')}</option>
                {emulsionOptions.map((emulsion) => <option key={emulsion.id} value={emulsion.id}>{emulsion.manufacturer} {emulsion.brand} ({emulsion.isoSpeed})</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="new-film-expiration">{t('film.form.expiration')}</label>
              <input id="new-film-expiration" type="date" value={form.expirationDate} onChange={(e) => setForm((prev) => ({ ...prev, expirationDate: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="new-film-supplier">{t('film.form.supplier')}</label>
              <input
                id="new-film-supplier"
                list="film-supplier-options-dashboard"
                value={form.supplierInput}
                onChange={(e) => setForm((prev) => ({ ...prev, supplierInput: e.target.value }))}
                placeholder={t('film.form.supplierPlaceholder')}
              />
              <datalist id="film-supplier-options-dashboard">
                {suppliers.map((s) => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>
            <div className="form-field">
              <label htmlFor="new-film-purchase-channel">{t('film.form.purchaseChannel')}</label>
              <input id="new-film-purchase-channel" value={form.purchaseChannel} onChange={(e) => setForm((prev) => ({ ...prev, purchaseChannel: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
              <div className="form-field">
                <label htmlFor="new-film-purchase-price">{t('film.form.purchasePrice')}</label>
                <input id="new-film-purchase-price" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => setForm((prev) => ({ ...prev, purchasePrice: e.target.value }))} />
              </div>
              <div className="form-field">
                <label htmlFor="new-film-purchase-currency">{t('film.form.currency')}</label>
                <input id="new-film-purchase-currency" value={form.purchaseCurrencyCode} onChange={(e) => setForm((prev) => ({ ...prev, purchaseCurrencyCode: e.target.value }))} maxLength={3} />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="new-film-order-ref">{t('film.form.orderRef')}</label>
              <input id="new-film-order-ref" value={form.purchaseOrderRef} onChange={(e) => setForm((prev) => ({ ...prev, purchaseOrderRef: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="new-film-obtained-date">{t('film.form.obtainedDate')}</label>
              <input id="new-film-obtained-date" type="date" value={form.purchaseObtainedDate} onChange={(e) => setForm((prev) => ({ ...prev, purchaseObtainedDate: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="new-film-rating">{t('film.form.rating')}</label>
              <select id="new-film-rating" value={form.rating} onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}>
                <option value="">{t('film.form.noRating')}</option>
                {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={isCreatingFilm}>{isCreatingFilm ? t('film.form.creating') : t('film.form.create')}</button>
              <button type="button" className="secondary" onClick={() => setCreateOpen(false)}>{t('film.form.cancel')}</button>
            </div>
          </fieldset>
        </form>
      </FormDrawer>
    </main>
  );
}

export function FilmInventoryPage({ formatKey }: { formatKey: FilmFormatRouteKey }) {
  const { t } = useTranslation();
  const { api } = useSession();
  const searchParams = useSearchParams();
  const formatFilter = formatKey;
  const stateCodeFromUrl = searchParams?.get('stateCode') ?? '';

  const [films, setFilms] = useState<FilmSummary[]>([]);
  const [formats, setFormats] = useState<FilmFormat[]>([]);
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const [emulsions, setEmulsions] = useState<Emulsion[]>([]);
  const [suppliers, setSuppliers] = useState<FilmSupplier[]>([]);
  const [states, setStates] = useState<FilmState[]>([]);
  const [stateCode, setStateCode] = useState(stateCodeFromUrl);
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const {
    beginSubmit: beginCreateSubmit,
    endSubmit: endCreateSubmit,
    idempotencyKeyRef: createIdempotencyKeyRef,
    isSubmitting: isCreatingFilm,
    resetSubmit: resetCreateSubmit
  } = useIdempotentSubmit();
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    emulsionId: '',
    packageTypeId: '',
    filmFormatId: '',
    expirationDate: '',
    supplierInput: '',
    purchaseChannel: '',
    purchasePrice: '',
    purchaseCurrencyCode: 'USD',
    purchaseOrderRef: '',
    purchaseObtainedDate: todayLocalDate(),
    rating: ''
  });

  const load = useCallback(async (state = stateCode, supplier = supplierId) => {
    setIsLoading(true);
    try {
      const query: FilmListQuery = {};
      if (state) query['stateCode'] = state;
      if (supplier) query['supplierId'] = Number(supplier);
      const fetchAllFilms = async () => {
        const items: FilmSummary[] = [];
        let afterId: number | undefined;

        do {
          const response = await api.getFilms({ ...query, limit: LIST_MAX_LIMIT, ...(afterId ? { afterId } : {}) });
          items.push(...response.items);
          afterId = response.nextCursor ?? undefined;
        } while (afterId);

        return items;
      };

      const [filmItems, refs, ems, sups] = await Promise.all([
        fetchAllFilms(),
        api.getReferenceTables(),
        api.getEmulsions(),
        api.getFilmSuppliers({ limit: LIST_MAX_LIMIT })
      ]);
      setFilms(filmItems);
      setFormats(refs.filmFormats);
      setPackageTypes(refs.packageTypes);
      setStates(refs.filmStates);
      setEmulsions(ems);
      setSuppliers(sups);
    } catch (err) {
      setError(resolveApiError(err, t, t('film.failedToLoad')));
    } finally {
      setIsLoading(false);
    }
  }, [api, stateCode, supplierId]);

  useEffect(() => {
    setStateCode(stateCodeFromUrl);
  }, [stateCodeFromUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isCreateOpen) {
      resetCreateSubmit();
    }
  }, [isCreateOpen, resetCreateSubmit]);

  const lockedFormatCodes = useMemo(() => {
    if (!formatFilter) return [];
    return FORMAT_FILTER_CODES[formatFilter] ?? [formatFilter];
  }, [formatFilter]);

  const visibleFilms = useMemo(() => {
    let result = films;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((film) =>
        `${film.name} ${film.emulsion.manufacturer} ${film.emulsion.brand}`.toLowerCase().includes(q)
      );
    }
    if (lockedFormatCodes.length > 0) {
      result = result.filter((film) => lockedFormatCodes.includes(film.filmFormat.code));
    }
    return result;
  }, [films, search, lockedFormatCodes]);

  const formatOptions = useMemo(() => {
    if (lockedFormatCodes.length === 0) return formats;
    return formats.filter((format) => lockedFormatCodes.includes(format.code));
  }, [formats, lockedFormatCodes]);
  const isFormatLocked = lockedFormatCodes.length === 1 && formatOptions.length === 1;
  const selectedFormatId = form.filmFormatId ? Number(form.filmFormatId) : null;
  const packageTypeOptions = selectedFormatId
    ? packageTypes.filter((pkg) => pkg.filmFormatId === selectedFormatId)
    : [];
  const emulsionOptions = selectedFormatId
    ? emulsions.filter((emulsion) => emulsion.filmFormats.some((format) => format.id === selectedFormatId))
    : [];

  useEffect(() => {
    if (!isCreateOpen) return;
    setForm((prev) => {
      if (isFormatLocked) {
        const locked = formatOptions[0];
        if (locked && prev.filmFormatId !== String(locked.id)) {
          return { ...prev, filmFormatId: String(locked.id), emulsionId: '', packageTypeId: '' };
        }
        return prev;
      }
      if (prev.filmFormatId && formatOptions.length > 0 && !formatOptions.some((format) => String(format.id) === prev.filmFormatId)) {
        return { ...prev, filmFormatId: '', emulsionId: '', packageTypeId: '' };
      }
      return prev;
    });
  }, [formatOptions, isCreateOpen, isFormatLocked]);

  const FORMAT_FILTER_LABELS: Record<string, string> = {
    '35mm': t('navigation.film35mm'),
    'medium-format': t('navigation.filmMediumFormat'),
    'large-format': t('navigation.filmLargeFormat'),
    'instant': t('navigation.filmInstant')
  };

  const formatLabel = formatFilter
    ? (FORMAT_FILTER_LABELS[formatFilter] ?? formats.find((f) => f.code === formatFilter)?.label ?? toTitleCase(formatFilter.replace(/[-_]/g, ' ')))
    : null;

  const formatHeading = formatLabel ?? t('film.inventory');

  const formatSubtitle = formatLabel
    ? t('film.filteredSubtitle', { format: formatLabel })
    : t('film.inventorySubtitle');

  return (
    <main>
      <PageHeader
        heading={formatHeading}
        subtitle={formatSubtitle}
        action={
          <button type="button" onClick={() => setCreateOpen(true)}>{t('film.addFilm')}</button>
        }
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      <section className="card">
        <div className="filter-bar">
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="film-search">{t('film.searchLabel')}</label>
            <input id="film-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('film.searchPlaceholder')} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="film-state-filter">{t('film.stateFilter')}</label>
            <select id="film-state-filter" value={stateCode} onChange={(e) => {
              setStateCode(e.target.value);
            }}>
              <option value="">{t('film.allStates')}</option>
              {states.map((state) => <option key={state.id} value={state.code}>{state.label}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="film-supplier-filter">{t('film.supplierFilter')}</label>
            <select id="film-supplier-filter" value={supplierId} onChange={(e) => {
              setSupplierId(e.target.value);
            }}>
              <option value="">{t('film.allSuppliers')}</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        {isLoading ? (
          <div>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-row" />)}
          </div>
        ) : visibleFilms.length === 0 ? (
          <div className="empty-state"><p>{t('film.noFilmFound')}</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">{t('film.tableCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('film.columns.film')}</th>
                  <th scope="col">{t('film.columns.emulsion')}</th>
                  <th scope="col">{t('film.columns.format')}</th>
                  <th scope="col">{t('film.columns.iso')}</th>
                  <th scope="col">{t('film.columns.state')}</th>
                  <th scope="col">{t('film.columns.knownCost')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleFilms.map((film) => (
                  <tr key={film.id}>
                    <td><Link href={`/film/${film.id}`} style={{ fontWeight: 600 }}>{film.name}</Link></td>
                    <td>{film.emulsion.manufacturer} {film.emulsion.brand}</td>
                    <td>{film.filmFormat.label}</td>
                    <td>{film.emulsion.isoSpeed}</td>
                    <td><StateBadge code={film.currentState.code} label={film.currentState.label} /></td>
                    <td style={{ color: 'var(--muted-ink)', fontSize: 13 }}>{formatKnownCost(film)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading ? (
          <p style={{ fontSize: 13, color: 'var(--muted-ink)', margin: '10px 0 0' }}>
            {t('film.count', { count: visibleFilms.length })}
          </p>
        ) : null}
      </section>

      <FormDrawer open={isCreateOpen} onClose={() => setCreateOpen(false)} title={t('film.addFilmDrawerTitle')}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!beginCreateSubmit()) return;
          setError(null);
          try {
            const payload = filmCreateRequestSchema.parse({
              name: form.name,
              emulsionId: Number(form.emulsionId),
              packageTypeId: Number(form.packageTypeId),
              filmFormatId: Number(form.filmFormatId),
              expirationDate: toIsoFromDateInput(form.expirationDate),
              supplierName: (() => {
                const supplierName = form.supplierInput.trim();
                if (!supplierName) return undefined;
                const existing = suppliers.find((supplier) => supplier.name.toLowerCase() === supplierName.toLowerCase());
                return existing ? undefined : supplierName;
              })(),
              purchaseInfo: (() => {
                const supplierName = form.supplierInput.trim();
                const existing = supplierName
                  ? suppliers.find((supplier) => supplier.name.toLowerCase() === supplierName.toLowerCase())
                  : undefined;
                const channel = form.purchaseChannel.trim();
                const price = form.purchasePrice.trim();
                const currencyCode = form.purchaseCurrencyCode.trim().toUpperCase();
                const orderRef = form.purchaseOrderRef.trim();
                const obtainedDate = toIsoFromDateInput(form.purchaseObtainedDate);
                const hasPurchaseInfo = Boolean(existing || supplierName || channel || price || currencyCode || orderRef || obtainedDate);
                return hasPurchaseInfo
                  ? {
                      supplierId: existing?.id,
                      channel: channel || null,
                      price: price ? Number(price) : null,
                      currencyCode: currencyCode || null,
                      orderRef: orderRef || null,
                      obtainedDate
                    }
                  : undefined;
              })(),
              rating: form.rating ? Number(form.rating) : undefined
            });
            await api.createFilm(payload, createIdempotencyKeyRef.current);
            setForm({
              name: '',
              emulsionId: '',
              packageTypeId: '',
              filmFormatId: isFormatLocked && formatOptions[0] ? String(formatOptions[0].id) : '',
              expirationDate: '',
              supplierInput: '',
              purchaseChannel: '',
              purchasePrice: '',
              purchaseCurrencyCode: 'USD',
              purchaseOrderRef: '',
              purchaseObtainedDate: todayLocalDate(),
              rating: ''
            });
            await load(stateCode, supplierId);
            setCreateOpen(false);
          } catch (err) {
            setError(resolveApiError(err, t, t('film.failedToCreate')));
          } finally {
            endCreateSubmit();
          }
        }}>
          <fieldset disabled={isCreatingFilm} style={{ margin: 0, padding: 0, border: 'none' }}>
          <legend className="sr-only">{t('film.form.newLegend')}</legend>
          <div className="form-field">
            <label htmlFor="new-film-name">{t('film.form.name')}</label>
            <input id="new-film-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div className="form-field">
            <label htmlFor="new-film-format">{t('film.form.format')}</label>
            <select
              id="new-film-format"
              value={form.filmFormatId}
              onChange={(e) => setForm((prev) => ({ ...prev, filmFormatId: e.target.value, emulsionId: '', packageTypeId: '' }))}
              required
              disabled={isFormatLocked}
            >
              <option value="">{t('film.form.selectFormat')}</option>
              {formatOptions.map((fmt) => <option key={fmt.id} value={fmt.id}>{fmt.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-film-package-type">{t('film.form.packageType')}</label>
            <select id="new-film-package-type" value={form.packageTypeId} onChange={(e) => setForm((prev) => ({ ...prev, packageTypeId: e.target.value }))} required disabled={!form.filmFormatId}>
              <option value="">{t('film.form.selectPackageType')}</option>
              {packageTypeOptions.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-film-emulsion">{t('film.form.emulsion')}</label>
            <select id="new-film-emulsion" value={form.emulsionId} onChange={(e) => setForm((prev) => ({ ...prev, emulsionId: e.target.value }))} required disabled={!form.filmFormatId}>
              <option value="">{t('film.form.selectEmulsion')}</option>
              {emulsionOptions.map((emulsion) => <option key={emulsion.id} value={emulsion.id}>{emulsion.manufacturer} {emulsion.brand} ({emulsion.isoSpeed})</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-film-expiration">{t('film.form.expiration')}</label>
            <input id="new-film-expiration" type="date" value={form.expirationDate} onChange={(e) => setForm((prev) => ({ ...prev, expirationDate: e.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="new-film-supplier">{t('film.form.supplier')}</label>
            <input
              id="new-film-supplier"
              list="film-supplier-options"
              value={form.supplierInput}
              onChange={(e) => setForm((prev) => ({ ...prev, supplierInput: e.target.value }))}
              placeholder={t('film.form.supplierPlaceholder')}
            />
            <datalist id="film-supplier-options">
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.name} />)}
            </datalist>
          </div>
          <div className="form-field">
            <label htmlFor="new-film-purchase-channel">{t('film.form.purchaseChannel')}</label>
            <input id="new-film-purchase-channel" value={form.purchaseChannel} onChange={(e) => setForm((prev) => ({ ...prev, purchaseChannel: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
            <div className="form-field">
              <label htmlFor="new-film-purchase-price">{t('film.form.purchasePrice')}</label>
              <input id="new-film-purchase-price" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => setForm((prev) => ({ ...prev, purchasePrice: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="new-film-purchase-currency">{t('film.form.currency')}</label>
              <input id="new-film-purchase-currency" value={form.purchaseCurrencyCode} onChange={(e) => setForm((prev) => ({ ...prev, purchaseCurrencyCode: e.target.value }))} maxLength={3} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="new-film-order-ref">{t('film.form.orderRef')}</label>
            <input id="new-film-order-ref" value={form.purchaseOrderRef} onChange={(e) => setForm((prev) => ({ ...prev, purchaseOrderRef: e.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="new-film-obtained-date">{t('film.form.obtainedDate')}</label>
            <input id="new-film-obtained-date" type="date" value={form.purchaseObtainedDate} onChange={(e) => setForm((prev) => ({ ...prev, purchaseObtainedDate: e.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="new-film-rating">{t('film.form.rating')}</label>
            <select id="new-film-rating" value={form.rating} onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}>
              <option value="">{t('film.form.noRating')}</option>
              {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isCreatingFilm}>{isCreatingFilm ? t('film.form.creating') : t('film.form.create')}</button>
            <button type="button" className="secondary" onClick={() => setCreateOpen(false)}>{t('film.form.cancel')}</button>
          </div>
          </fieldset>
        </form>
      </FormDrawer>
    </main>
  );
}

export function FilmDetailPage() {
  const { t } = useTranslation();
  const { api } = useSession();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [film, setFilm] = useState<FilmDetail | null>(null);
  const [events, setEvents] = useState<FilmJourneyEvent[]>([]);
  const [frames, setFrames] = useState<FilmFrame[]>([]);
  const [refTables, setRefTables] = useState<ReferenceTables | null>(null);
  const [name, setName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setEditOpen] = useState(false);
  const [isEventOpen, setEventOpen] = useState(false);
  const {
    beginSubmit: beginEditSubmit,
    endSubmit: endEditSubmit,
    idempotencyKeyRef: editIdempotencyKeyRef,
    isSubmitting: isSavingFilm,
    resetSubmit: resetEditSubmit
  } = useIdempotentSubmit();
  const [expandedFrameIds, setExpandedFrameIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isEditOpen) {
      resetEditSubmit();
    }
  }, [isEditOpen, resetEditSubmit]);

  async function load() {
    try {
      const [detail, filmEvents, filmFrames, refs] = await Promise.all([
        api.getFilm(id),
        api.getFilmEvents(id),
        api.getFilmFrames(id),
        api.getReferenceTables()
      ]);
      setFilm(detail);
      setEvents(filmEvents);
      setFrames(filmFrames);
      setRefTables(refs);
      setName(detail.name);
      setExpirationDate(detail.expirationDate ? detail.expirationDate.slice(0, 10) : '');
    } catch (err) {
      setError(resolveApiError(err, t, t('film.failedToLoadDetail')));
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void load();
  }, [id]);

  function toggleFrame(frameId: number) {
    setExpandedFrameIds((prev) => {
      const next = new Set(prev);
      next.has(frameId) ? next.delete(frameId) : next.add(frameId);
      return next;
    });
  }

  const isFrameEditable = film?.currentStateCode === 'loaded';

  return (
    <main>
      <Link href="/film" className="back-link">
        <i className="bi bi-arrow-left" aria-hidden="true" />
        {t('film.backToInventory')}
      </Link>

      <PageHeader
        heading={film?.name ?? t('film.filmDetails')}
        subtitle={film
          ? `${film.emulsion.manufacturer} ${film.emulsion.brand} · ${film.filmFormat.label}`
          : t('film.detailSubtitle')}
        action={
          film ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="secondary" onClick={() => setEditOpen(true)}>{t('film.edit')}</button>
              <button type="button" onClick={() => setEventOpen(true)}>{t('film.addEvent')}</button>
            </div>
          ) : null
        }
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      {film ? (
        <>
          {/* Film metadata card */}
          <section className="card">
            <div className="detail-grid">
              <div className="detail-field">
                <span className="detail-label">{t('film.detail.currentState')}</span>
                <span className="detail-value">
                  <StateBadge code={film.currentState.code} label={film.currentState.label} />
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{t('film.detail.format')}</span>
                <span className="detail-value">{film.filmFormat.label}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{t('film.detail.iso')}</span>
                <span className="detail-value">{film.emulsion.isoSpeed}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{t('film.detail.expiration')}</span>
                <span className="detail-value">
                  {film.expirationDate ? new Date(film.expirationDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{t('film.detail.purchaseCost')}</span>
                <span className="detail-value">{formatCost(film.purchaseCostAllocated)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{t('film.detail.developmentCost')}</span>
                <span className="detail-value">{formatCost(film.developmentCost)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{t('film.detail.knownTotal')}</span>
                <span className="detail-value">{formatKnownCost(film)}</span>
              </div>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: frames.length > 0 ? '1fr 340px' : '1fr', gap: 16, marginTop: 0, alignItems: 'start' }}>
            {/* Frames */}
            {frames.length > 0 ? (
              <section className="card" style={{ margin: 0 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>
                  {t('film.frames.heading', { count: frames.length })}
                  {!isFrameEditable ? <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted-ink)', marginLeft: 8 }}>{t('film.frames.metadataEditableHint')}</span> : null}
                </h2>
                <div className="table-scroll">
                <table>
                  <caption className="sr-only">{t('film.frames.tableCaption', { filmName: film.name })}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('film.frames.columns.number')}</th>
                      <th scope="col">{t('film.frames.columns.state')}</th>
                      <th scope="col">{t('film.frames.columns.aperture')}</th>
                      <th scope="col">{t('film.frames.columns.shutter')}</th>
                      <th scope="col">{t('film.frames.columns.filter')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frames.map((frame) => (
                      <React.Fragment key={frame.id}>
                        <tr
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-expanded={expandedFrameIds.has(frame.id)}
                          aria-controls={`frame-editor-${frame.id}`}
                          onClick={() => toggleFrame(frame.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              toggleFrame(frame.id);
                            }
                          }}
                        >
                          <td>{frame.frameNumber}</td>
                          <td><StateBadge code={frame.currentStateCode} label={frame.currentStateCode} /></td>
                          <td>{frame.aperture !== null ? `f/${frame.aperture}` : '—'}</td>
                          <td>
                            {frame.shutterSpeedSeconds !== null
                              ? (frame.shutterSpeedSeconds < 1
                                  ? `1/${Math.round(1 / frame.shutterSpeedSeconds)}`
                                  : `${frame.shutterSpeedSeconds}s`)
                              : '—'}
                          </td>
                          <td>{frame.filterUsed === true ? t('film.frames.filterYes') : frame.filterUsed === false ? t('film.frames.filterNo') : '—'}</td>
                        </tr>
                        {expandedFrameIds.has(frame.id) ? (
                          <tr id={`frame-editor-${frame.id}`}>
                            <td colSpan={5} style={{ padding: '4px 8px 8px' }}>
                              <FrameEditor frame={frame} filmId={id} readonly={!isFrameEditable} />
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                </div>
                {isFrameEditable ? (
                  <p className="field-help" style={{ marginTop: 8 }}>{t('film.frames.clickToExpand')}</p>
                ) : null}
              </section>
            ) : null}

            {/* Right column: timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section className="card" style={{ margin: 0 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>{t('film.journey.heading')}</h2>
                {events.length === 0 ? (
                  <p className="field-help">{t('film.journey.noEvents')}</p>
                ) : (
                  <ul className="timeline">
                    {events.map((event) => {
                      const stateLabel = refTables?.filmStates.find((s) => s.code === event.filmStateCode)?.label ?? event.filmStateCode;
                      return (
                        <li key={event.id} className="timeline-item">
                          <div className="timeline-dot" />
                          <div className="timeline-body">
                            <p className="timeline-title">{stateLabel}</p>
                            <p className="timeline-sub">{new Date(event.occurredAt).toLocaleString()}</p>
                            {event.notes ? <p className="timeline-note">{event.notes}</p> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>

          {/* Edit drawer */}
          <FormDrawer open={isEditOpen} onClose={() => setEditOpen(false)} title={t('film.editFilmDrawerTitle')}>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!beginEditSubmit()) return;
              setError(null);
              try {
                const payload = filmUpdateRequestSchema.parse({
                  name,
                  expirationDate: toIsoFromDateInput(expirationDate)
                });
                await api.updateFilm(id, payload, editIdempotencyKeyRef.current);
                await load();
                setEditOpen(false);
              } catch (err) {
                setError(resolveApiError(err, t, t('film.failedToUpdate')));
              } finally {
                endEditSubmit();
              }
            }}>
              <fieldset disabled={isSavingFilm} style={{ margin: 0, padding: 0, border: 'none' }}>
              <legend className="sr-only">{t('film.form.editLegend')}</legend>
              <div className="form-field">
                <label htmlFor="edit-film-name">{t('film.form.name')}</label>
                <input id="edit-film-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-field">
                <label htmlFor="edit-film-expiration">{t('film.form.expiration')}</label>
                <input id="edit-film-expiration" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
              </div>
              <div className="form-actions">
                <button type="submit" disabled={isSavingFilm}>{isSavingFilm ? t('film.form.saving') : t('film.form.save')}</button>
                <button type="button" className="secondary" onClick={() => setEditOpen(false)}>{t('film.form.cancel')}</button>
              </div>
              </fieldset>
            </form>
          </FormDrawer>

          <FormDrawer open={isEventOpen} onClose={() => setEventOpen(false)} title={t('film.addEventDrawerTitle')}>
            {refTables ? (
              <FilmEventForm
                filmId={id}
                filmFormatId={film.filmFormatId}
                currentStateCode={film.currentStateCode}
                availableStates={refTables.filmStates}
                refTables={refTables}
                onEventAdded={() => {
                  void load();
                  setEventOpen(false);
                }}
              />
            ) : null}
          </FormDrawer>
        </>
      ) : (
        !error ? (
          <div>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
          </div>
        ) : null
      )}
    </main>
  );
}
