'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@frollz2/i18n';
import {
  LIST_MAX_LIMIT,
  createFilmLabRequestSchema,
  createFilmSupplierRequestSchema,
  importDataRequestSchema,
  updateFilmLabRequestSchema,
  updateFilmSupplierRequestSchema
} from '@frollz2/schema';
import type { ReferenceValueKind } from '@frollz2/schema';
import { useSession } from '../../auth/session';
import { resolveApiError } from '../../utils/resolve-api-error';
import { FormDrawer } from '../FormDrawer';
import { PageHeader } from '../PageHeader';
import { ReferenceTypeaheadInput } from '../ReferenceTypeaheadInput';
import { createIdempotencyKey } from '../../utils/idempotency';
import { useIdempotencyKey, useIdempotentSubmit } from '../../hooks/useIdempotentSubmit';

type AdminRow = {
  id: number;
  name: string;
  contact?: string | null;
  email?: string | null;
  website?: string | null;
  notes?: string | null;
  rating?: number | null;
  defaultProcesses?: string | null;
  active: boolean;
};

type AdminForm = {
  id: number | null;
  name: string;
  contact: string;
  email: string;
  website: string;
  notes: string;
  rating: string;
  defaultProcesses: string;
};

const EMPTY_FORM: AdminForm = { id: null, name: '', contact: '', email: '', website: '', notes: '', rating: '', defaultProcesses: '' };

function StarRatingInput({
  value,
  onChange,
  id = 'admin-rating',
  labelledBy
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  labelledBy?: string;
}) {
  const { t } = useTranslation();
  const selected = value ? Number(value) : 0;

  function StarIcon({ filled }: { filled: boolean }) {
    return <i className={`bi ${filled ? 'bi-star-fill' : 'bi-star'}`} aria-hidden="true" />;
  }

  return (
    <div id={id} role="group" aria-label={labelledBy ? undefined : t('admin.rating.groupLabel')} aria-labelledby={labelledBy} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = selected >= star;
        return (
          <button
            key={star}
            type="button"
            className={active ? '' : 'secondary'}
            style={{ padding: '6px 8px', minWidth: 0, lineHeight: 0 }}
            onClick={() => onChange(String(star))}
            aria-label={t('admin.rating.starLabel', { count: star })}
            aria-pressed={selected === star}
          >
            <StarIcon filled={active} />
          </button>
        );
      })}
      <button
        type="button"
        className="secondary"
        style={{ padding: '6px 8px', fontSize: 12 }}
        onClick={() => onChange('')}
        aria-label={t('admin.rating.clear')}
      >
        {t('admin.rating.clear')}
      </button>
    </div>
  );
}

export function AdminOverviewPage() {
  const { t } = useTranslation();
  const sections = [
    {
      href: '/admin/data-export',
      title: t('admin.sections.dataExport.title'),
      description: t('admin.sections.dataExport.description')
    },
    {
      href: '/admin/film-labs',
      title: t('admin.sections.filmLabs.title'),
      description: t('admin.sections.filmLabs.description')
    },
    {
      href: '/admin/film-labs/stats',
      title: 'Lab Stats',
      description: 'Review turnaround and development cost by lab and process.'
    },
    {
      href: '/admin/film-suppliers',
      title: t('admin.sections.filmSuppliers.title'),
      description: t('admin.sections.filmSuppliers.description')
    },
    {
      href: '/admin/film-suppliers/stats',
      title: 'Supplier Stats',
      description: 'Compare film prices by emulsion, package, format, and currency.'
    }
  ];

  return (
    <main>
      <PageHeader
        heading={t('admin.heading')}
        subtitle={t('admin.subtitle')}
      />
      <section className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="card"
              style={{ margin: 0, textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>{section.title}</h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted-ink)' }}>{section.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function AdminListPage({
  title,
  subtitle,
  fetchRows,
  createRow,
  updateRow,
  entityName,
  nameReferenceKind,
  contactReferenceKind,
  showDefaultProcesses = false
}: {
  title: string;
  subtitle: string;
  entityName: string;
  fetchRows: (query: { q: string; includeInactive: boolean }) => Promise<AdminRow[]>;
  createRow: (data: Omit<AdminForm, 'id'>, idempotencyKey: string) => Promise<void>;
  updateRow: (id: number, data: Record<string, unknown>, idempotencyKey: string) => Promise<void>;
  nameReferenceKind?: ReferenceValueKind;
  contactReferenceKind?: ReferenceValueKind;
  showDefaultProcesses?: boolean;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const {
    beginSubmit: beginFormSubmit,
    endSubmit: endFormSubmit,
    idempotencyKeyRef: formIdempotencyKeyRef,
    isSubmitting: isSubmittingForm,
    resetIdempotencyKey: resetFormIdempotencyKey,
    resetSubmit: resetFormSubmit
  } = useIdempotentSubmit();
  const [isTogglingRow, setIsTogglingRow] = useState<number | null>(null);
  const rowToggleLockRef = useRef(false);
  const [form, setForm] = useState<AdminForm>(EMPTY_FORM);

  async function load() {
    setIsLoading(true);
    try {
      const data = await fetchRows({ q: debouncedQ, includeInactive });
      setRows(data);
    } catch (err) {
      setError(resolveApiError(err, t, t('admin.failedToLoad', { entity: entityName })));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timeout);
  }, [q]);

  useEffect(() => { void load(); }, [debouncedQ, includeInactive]);

  function openCreate() {
    resetFormSubmit();
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(row: AdminRow) {
    resetFormSubmit();
    setForm({
      id: row.id,
      name: row.name,
      contact: row.contact ?? '',
      email: row.email ?? '',
      website: row.website ?? '',
      notes: row.notes ?? '',
      rating: row.rating != null ? String(row.rating) : '',
      defaultProcesses: row.defaultProcesses ?? ''
    });
    setFormOpen(true);
  }

  return (
    <main>
      <PageHeader
        heading={title}
        subtitle={subtitle}
        action={<button type="button" onClick={openCreate}>{t('admin.newEntity', { entity: entityName })}</button>}
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      <section className="card">
        <div className="filter-bar">
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="admin-search">{t('admin.search', { entity: entityName })}</label>
            <input id="admin-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.searchPlaceholder')} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                style={{ width: 'auto', margin: 0 }}
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              {t('admin.includeInactive')}
            </label>
          </div>
        </div>
      </section>

      <section className="card">
        {isLoading ? (
          <div>{[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-row" />)}</div>
        ) : rows.length === 0 ? (
          <div className="empty-state"><p>{t('admin.noEntitiesFound', { entity: entityName })}</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">{t('admin.tableCaption', { title })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('admin.columns.name')}</th>
                  <th scope="col">{t('admin.columns.status')}</th>
                  <th scope="col">{t('admin.columns.rating')}</th>
                  <th scope="col">{t('admin.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 500 }}>{row.name}</td>
                    <td>
                      <span className={row.active ? 'status-active' : 'status-inactive'} style={{ fontSize: 13 }}>
                        {row.active ? t('admin.status.active') : t('admin.status.inactive')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted-ink)', fontSize: 13 }} aria-label={row.rating != null ? t('admin.rating.ariaFull', { count: row.rating }) : t('admin.rating.ariaNone')}>
                      {row.rating != null ? `${'★'.repeat(row.rating)}${'☆'.repeat(5 - row.rating)}` : '—'}
                    </td>
                    <td>
                      <span className="row-actions">
                        <button style={{ fontSize: 13, padding: '6px 10px' }} onClick={() => openEdit(row)}>{t('admin.actions.edit')}</button>
                        <button
                          className={row.active ? 'danger' : 'secondary'}
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          disabled={isTogglingRow === row.id}
                          onClick={async () => {
                            if (rowToggleLockRef.current || isTogglingRow === row.id) return;
                            rowToggleLockRef.current = true;
                            setIsTogglingRow(row.id);
                            try {
                              await updateRow(row.id, { active: !row.active }, createIdempotencyKey());
                              await load();
                            } catch (err) {
                              setError(resolveApiError(err, t, t('admin.failedToUpdate', { entity: entityName })));
                            } finally {
                              rowToggleLockRef.current = false;
                              setIsTogglingRow(null);
                            }
                          }}
                        >
                          {isTogglingRow === row.id ? t('admin.actions.saving') : (row.active ? t('admin.actions.archive') : t('admin.actions.restore'))}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading ? (
          <p style={{ fontSize: 13, color: 'var(--muted-ink)', margin: '10px 0 0' }}>
            {t('admin.count', { count: rows.length, entity: entityName })}
          </p>
        ) : null}
      </section>

      <FormDrawer
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? t('admin.form.editTitle', { entity: entityName }) : t('admin.form.newTitle', { entity: entityName })}
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!beginFormSubmit()) return;
          setError(null);
          try {
            if (form.id) {
              await updateRow(form.id, {
                name: form.name,
                contact: form.contact || null,
                email: form.email || null,
                website: form.website || null,
                notes: form.notes || null,
                rating: form.rating ? Number(form.rating) : null,
                ...(showDefaultProcesses ? { defaultProcesses: form.defaultProcesses || null } : {})
              }, formIdempotencyKeyRef.current);
            } else {
              await createRow({
                name: form.name,
                contact: form.contact,
                email: form.email,
                website: form.website,
                notes: form.notes,
                rating: form.rating,
                defaultProcesses: showDefaultProcesses ? form.defaultProcesses : ''
              }, formIdempotencyKeyRef.current);
            }
            setForm(EMPTY_FORM);
            resetFormIdempotencyKey();
            setFormOpen(false);
            await load();
          } catch (err) {
            setError(resolveApiError(err, t, t('admin.failedToSave', { entity: entityName })));
          } finally {
            endFormSubmit();
          }
        }}>
          <fieldset disabled={isSubmittingForm} style={{ margin: 0, padding: 0, border: 'none' }}>
          <legend className="sr-only">{form.id ? t('admin.form.editLegend', { entity: entityName }) : t('admin.form.newLegend', { entity: entityName })}</legend>
          {nameReferenceKind ? (
            <ReferenceTypeaheadInput
              id="admin-name"
              label={t('admin.form.name')}
              kind={nameReferenceKind}
              value={form.name}
              onChange={(name) => setForm((p) => ({ ...p, name }))}
              required
            />
          ) : (
            <div className="form-field">
              <label htmlFor="admin-name">{t('admin.form.name')}</label>
              <input id="admin-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
          )}
          {contactReferenceKind ? (
            <ReferenceTypeaheadInput
              id="admin-contact"
              label={t('admin.form.contact')}
              kind={contactReferenceKind}
              value={form.contact}
              onChange={(contact) => setForm((p) => ({ ...p, contact }))}
            />
          ) : (
            <div className="form-field">
              <label htmlFor="admin-contact">{t('admin.form.contact')}</label>
              <input id="admin-contact" value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} />
            </div>
          )}
          <div className="form-field">
            <label htmlFor="admin-email">{t('admin.form.email')}</label>
            <input id="admin-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="admin-website">{t('admin.form.website')}</label>
            <input id="admin-website" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
          </div>
          {showDefaultProcesses ? (
            <div className="form-field">
              <label htmlFor="admin-default-processes">{t('admin.form.defaultProcesses')}</label>
              <input
                id="admin-default-processes"
                value={form.defaultProcesses}
                onChange={(e) => setForm((p) => ({ ...p, defaultProcesses: e.target.value }))}
                placeholder={t('admin.form.defaultProcessesPlaceholder')}
              />
            </div>
          ) : null}
          <div className="form-field">
            <span id="admin-rating-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-ink)' }}>{t('admin.rating.label')}</span>
            <StarRatingInput
              id="admin-rating"
              labelledBy="admin-rating-label"
              value={form.rating}
              onChange={(rating) => setForm((p) => ({ ...p, rating }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="admin-notes">{t('admin.form.notes')}</label>
            <textarea id="admin-notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isSubmittingForm}>
              {isSubmittingForm ? t('admin.form.saving') : (form.id ? t('admin.form.update') : t('admin.form.create'))}
            </button>
            <button type="button" className="secondary" onClick={() => setFormOpen(false)}>{t('admin.form.cancel')}</button>
          </div>
          </fieldset>
        </form>
      </FormDrawer>
    </main>
  );
}

export function FilmLabsAdminPage() {
  const { t } = useTranslation();
  const { api } = useSession();
  return (
    <AdminListPage
      title={t('admin.filmLabs.heading')}
      subtitle={t('admin.filmLabs.subtitle')}
      entityName={t('admin.filmLabs.entity')}
      nameReferenceKind="lab_name"
      contactReferenceKind="lab_contact"
      showDefaultProcesses
      fetchRows={({ q, includeInactive }) => api.getFilmLabs({ q, includeInactive, limit: LIST_MAX_LIMIT })}
      createRow={(data, idempotencyKey) => api.createFilmLab(createFilmLabRequestSchema.parse({
        name: data.name,
        contact: data.contact || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        notes: data.notes || undefined,
        rating: data.rating ? Number(data.rating) : undefined,
        defaultProcesses: data.defaultProcesses || undefined
      }), idempotencyKey).then(() => undefined)}
      updateRow={(id, data, idempotencyKey) => api.updateFilmLab(id, updateFilmLabRequestSchema.parse(data), idempotencyKey).then(() => undefined)}
    />
  );
}

export function FilmSuppliersAdminPage() {
  const { t } = useTranslation();
  const { api } = useSession();
  return (
    <AdminListPage
      title={t('admin.filmSuppliers.heading')}
      subtitle={t('admin.filmSuppliers.subtitle')}
      entityName={t('admin.filmSuppliers.entity')}
      fetchRows={({ q, includeInactive }) => api.getFilmSuppliers({ q, includeInactive, limit: LIST_MAX_LIMIT })}
      createRow={(data, idempotencyKey) => api.createFilmSupplier(createFilmSupplierRequestSchema.parse({
        name: data.name,
        contact: data.contact || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        notes: data.notes || undefined,
        rating: data.rating ? Number(data.rating) : undefined
      }), idempotencyKey).then(() => undefined)}
      updateRow={(id, data, idempotencyKey) => api.updateFilmSupplier(id, updateFilmSupplierRequestSchema.parse(data), idempotencyKey).then(() => undefined)}
    />
  );
}

export function DataExportImportPage() {
  const { t } = useTranslation();
  const { api } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const {
    idempotencyKeyRef: importIdempotencyKeyRef,
    resetIdempotencyKey: resetImportIdempotencyKey
  } = useIdempotencyKey();

  return (
    <main>
      <PageHeader
        heading={t('admin.dataExport.heading')}
        subtitle={t('admin.dataExport.subtitle')}
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      {success ? <div className="success-banner" role="status">{success}</div> : null}

      <section className="card">
        <div className="card-toolbar">
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>{t('admin.dataExport.export.heading')}</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--muted-ink)' }}>{t('admin.dataExport.export.description')}</p>
          </div>
          <button
            disabled={isExporting}
            onClick={async () => {
              setError(null);
              setSuccess(null);
              setIsExporting(true);
              try {
                const data = await api.exportData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `frollz-export-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                setSuccess(t('admin.dataExport.export.success'));
              } catch (err) {
                setError(resolveApiError(err, t, t('admin.dataExport.export.failed')));
              } finally {
                setIsExporting(false);
              }
            }}
          >
            {isExporting ? t('admin.dataExport.export.exporting') : t('admin.dataExport.export.button')}
          </button>
        </div>
      </section>

      <section className="card">
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>{t('admin.dataExport.import.heading')}</h2>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted-ink)' }}>
            {t('admin.dataExport.import.description')}
          </p>
        </div>
        <label htmlFor="data-import-file" className="sr-only">{t('admin.dataExport.import.label')}</label>
        <input
          id="data-import-file"
          type="file"
          accept="application/json"
          style={{ cursor: isImporting ? 'not-allowed' : 'pointer' }}
          disabled={isImporting}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError(null);
            setSuccess(null);
            setIsImporting(true);
            try {
              const text = await file.text();
              const payload = importDataRequestSchema.parse(JSON.parse(text));
              await api.importData(payload, importIdempotencyKeyRef.current);
              resetImportIdempotencyKey();
              setSuccess(t('admin.dataExport.import.success'));
            } catch (err) {
              setError(resolveApiError(err, t, t('admin.dataExport.import.failed')));
            } finally {
              setIsImporting(false);
            }
          }}
        />
      </section>
    </main>
  );
}
