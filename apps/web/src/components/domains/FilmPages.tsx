'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { LIST_MAX_LIMIT, filmCreateRequestSchema, filmUpdateRequestSchema } from '@frollz2/schema';
import type { Emulsion, FilmDetail, FilmFormat, FilmFrame, FilmJourneyEvent, FilmState, FilmSummary, FilmSupplier, PackageType, ReferenceTables } from '@frollz2/schema';
import type { FilmListQuery } from '@frollz2/api-client';
import { useSession } from '../../auth/session';
import { FormDrawer } from '../FormDrawer';
import { PageHeader } from '../PageHeader';
import { StateBadge } from '../StateBadge';
import { FilmEventForm } from '../FilmEventForm';
import { FrameEditor } from '../FrameEditor';
import { formatCost, formatKnownCost } from '../../utils/filmCost';
import { useIdempotentSubmit } from '../../hooks/useIdempotentSubmit';

function toIsoFromDateInput(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const FORMAT_FILTER_CODES: Record<string, string[]> = {
  '35mm': ['35mm'],
  'medium-format': ['120'],
  'large-format': ['4x5', '5x7', '8x10', '11x14'],
  instant: ['InstaxMini', 'InstaxWide', 'InstaxSquare']
};

function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function FilmListPage() {
  const { api } = useSession();
  const searchParams = useSearchParams();
  const formatFilter = searchParams?.get('format') ?? '';
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
      setError(err instanceof Error ? err.message : 'Failed to load films');
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

  const formatLabel = formatFilter
    ? (formatFilter === 'medium-format'
      ? 'Medium Format'
      : (formats.find((f) => f.code === formatFilter)?.label ?? toTitleCase(formatFilter.replace(/[-_]/g, ' '))))
    : null;

  const formatHeading = formatLabel ?? 'Film Inventory';

  const formatSubtitle = formatLabel
    ? `Filtered view for ${formatLabel}.`
    : 'Track film stock and move rolls through state transitions.';

  return (
    <main>
      <PageHeader
        heading={formatHeading}
        subtitle={formatSubtitle}
        action={
          <button type="button" onClick={() => setCreateOpen(true)}>Add film</button>
        }
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      <section className="card">
        <div className="filter-bar">
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="film-search">Search films</label>
            <input id="film-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, emulsion, brand…" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="film-state-filter">Film state</label>
            <select id="film-state-filter" value={stateCode} onChange={(e) => {
              setStateCode(e.target.value);
            }}>
              <option value="">All states</option>
              {states.map((state) => <option key={state.id} value={state.code}>{state.label}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="film-supplier-filter">Supplier</label>
            <select id="film-supplier-filter" value={supplierId} onChange={(e) => {
              setSupplierId(e.target.value);
            }}>
              <option value="">All suppliers</option>
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
          <div className="empty-state"><p>No film found for your current filters.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Film inventory matching the current filters</caption>
              <thead>
                <tr>
                  <th scope="col">Film</th>
                  <th scope="col">Emulsion</th>
                  <th scope="col">Format</th>
                  <th scope="col">ISO</th>
                  <th scope="col">State</th>
                  <th scope="col">Known cost</th>
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
            {visibleFilms.length} film{visibleFilms.length !== 1 ? 's' : ''}
          </p>
        ) : null}
      </section>

      <FormDrawer open={isCreateOpen} onClose={() => setCreateOpen(false)} title="Add film">
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
            setError(err instanceof Error ? err.message : 'Failed to create film');
          } finally {
            endCreateSubmit();
          }
        }}>
          <fieldset disabled={isCreatingFilm} style={{ margin: 0, padding: 0, border: 'none' }}>
          <legend className="sr-only">New film details</legend>
          <div className="form-field">
            <label htmlFor="new-film-name">Name</label>
            <input id="new-film-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div className="form-field">
            <label htmlFor="new-film-format">Film format</label>
            <select
              id="new-film-format"
              value={form.filmFormatId}
              onChange={(e) => setForm((prev) => ({ ...prev, filmFormatId: e.target.value, emulsionId: '', packageTypeId: '' }))}
              required
              disabled={isFormatLocked}
            >
              <option value="">Select film format</option>
              {formatOptions.map((fmt) => <option key={fmt.id} value={fmt.id}>{fmt.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-film-package-type">Package type</label>
            <select id="new-film-package-type" value={form.packageTypeId} onChange={(e) => setForm((prev) => ({ ...prev, packageTypeId: e.target.value }))} required disabled={!form.filmFormatId}>
              <option value="">Select package type</option>
              {packageTypeOptions.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-film-emulsion">Emulsion</label>
            <select id="new-film-emulsion" value={form.emulsionId} onChange={(e) => setForm((prev) => ({ ...prev, emulsionId: e.target.value }))} required disabled={!form.filmFormatId}>
              <option value="">Select emulsion</option>
              {emulsionOptions.map((emulsion) => <option key={emulsion.id} value={emulsion.id}>{emulsion.manufacturer} {emulsion.brand} ({emulsion.isoSpeed})</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-film-expiration">Expiration date (optional)</label>
            <input id="new-film-expiration" type="date" value={form.expirationDate} onChange={(e) => setForm((prev) => ({ ...prev, expirationDate: e.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="new-film-supplier">Supplier (optional)</label>
            <input
              id="new-film-supplier"
              list="film-supplier-options"
              value={form.supplierInput}
              onChange={(e) => setForm((prev) => ({ ...prev, supplierInput: e.target.value }))}
              placeholder="Select existing or type new"
            />
            <datalist id="film-supplier-options">
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.name} />)}
            </datalist>
          </div>
          <div className="form-field">
            <label htmlFor="new-film-purchase-channel">Purchase channel (optional)</label>
            <input id="new-film-purchase-channel" value={form.purchaseChannel} onChange={(e) => setForm((prev) => ({ ...prev, purchaseChannel: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
            <div className="form-field">
              <label htmlFor="new-film-purchase-price">Purchase price (optional)</label>
              <input id="new-film-purchase-price" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => setForm((prev) => ({ ...prev, purchasePrice: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="new-film-purchase-currency">Currency</label>
              <input id="new-film-purchase-currency" value={form.purchaseCurrencyCode} onChange={(e) => setForm((prev) => ({ ...prev, purchaseCurrencyCode: e.target.value }))} maxLength={3} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="new-film-order-ref">Order reference (optional)</label>
            <input id="new-film-order-ref" value={form.purchaseOrderRef} onChange={(e) => setForm((prev) => ({ ...prev, purchaseOrderRef: e.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="new-film-obtained-date">Obtained date (optional)</label>
            <input id="new-film-obtained-date" type="date" value={form.purchaseObtainedDate} onChange={(e) => setForm((prev) => ({ ...prev, purchaseObtainedDate: e.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="new-film-rating">Rating (optional)</label>
            <select id="new-film-rating" value={form.rating} onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}>
              <option value="">No rating</option>
              {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isCreatingFilm}>{isCreatingFilm ? 'Creating…' : 'Create film'}</button>
            <button type="button" className="secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          </div>
          </fieldset>
        </form>
      </FormDrawer>
    </main>
  );
}

export function FilmDetailPage() {
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
      setError(err instanceof Error ? err.message : 'Failed to load film detail');
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
        Back to film inventory
      </Link>

      <PageHeader
        heading={film?.name ?? 'Film Details'}
        subtitle={film
          ? `${film.emulsion.manufacturer} ${film.emulsion.brand} · ${film.filmFormat.label}`
          : 'View film details, frame metadata, and transition history.'}
        action={
          film ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="secondary" onClick={() => setEditOpen(true)}>Edit</button>
              <button type="button" onClick={() => setEventOpen(true)}>Add event</button>
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
                <span className="detail-label">Current state</span>
                <span className="detail-value">
                  <StateBadge code={film.currentState.code} label={film.currentState.label} />
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Format</span>
                <span className="detail-value">{film.filmFormat.label}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">ISO</span>
                <span className="detail-value">{film.emulsion.isoSpeed}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Expiration</span>
                <span className="detail-value">
                  {film.expirationDate ? new Date(film.expirationDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Purchase cost</span>
                <span className="detail-value">{formatCost(film.purchaseCostAllocated)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Development cost</span>
                <span className="detail-value">{formatCost(film.developmentCost)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Known total</span>
                <span className="detail-value">{formatKnownCost(film)}</span>
              </div>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: frames.length > 0 ? '1fr 340px' : '1fr', gap: 16, marginTop: 0, alignItems: 'start' }}>
            {/* Frames */}
            {frames.length > 0 ? (
              <section className="card" style={{ margin: 0 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>
                  Frames ({frames.length})
                  {!isFrameEditable ? <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted-ink)', marginLeft: 8 }}>metadata editable when loaded</span> : null}
                </h2>
                <div className="table-scroll">
                <table>
                  <caption className="sr-only">Frames for {film.name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">State</th>
                      <th scope="col">Aperture</th>
                      <th scope="col">Shutter</th>
                      <th scope="col">Filter</th>
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
                          <td>{frame.filterUsed === true ? 'Yes' : frame.filterUsed === false ? 'No' : '—'}</td>
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
                  <p className="field-help" style={{ marginTop: 8 }}>Click a row to expand and edit frame metadata.</p>
                ) : null}
              </section>
            ) : null}

            {/* Right column: timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {frames.length === 0 ? null : null}
              <section className="card" style={{ margin: 0 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Journey events</h2>
                {events.length === 0 ? (
                  <p className="field-help">No events recorded yet.</p>
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
          <FormDrawer open={isEditOpen} onClose={() => setEditOpen(false)} title="Edit film">
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
                setError(err instanceof Error ? err.message : 'Failed to update film');
              } finally {
                endEditSubmit();
              }
            }}>
              <fieldset disabled={isSavingFilm} style={{ margin: 0, padding: 0, border: 'none' }}>
              <legend className="sr-only">Edit film details</legend>
              <div className="form-field">
                <label htmlFor="edit-film-name">Name</label>
                <input id="edit-film-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-field">
                <label htmlFor="edit-film-expiration">Expiration date</label>
                <input id="edit-film-expiration" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
              </div>
              <div className="form-actions">
                <button type="submit" disabled={isSavingFilm}>{isSavingFilm ? 'Saving…' : 'Save'}</button>
                <button type="button" className="secondary" onClick={() => setEditOpen(false)}>Cancel</button>
              </div>
              </fieldset>
            </form>
          </FormDrawer>

          {/* Add event drawer (alternative full-page drawer for mobile) */}
          <FormDrawer open={isEventOpen} onClose={() => setEventOpen(false)} title="Add event">
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
