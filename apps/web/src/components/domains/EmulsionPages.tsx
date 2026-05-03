'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createEmulsionRequestSchema, updateEmulsionRequestSchema } from '@frollz2/schema';
import type { DevelopmentProcess, Emulsion, FilmFormat } from '@frollz2/schema';
import { useSession } from '../../auth/session';
import { FormDrawer } from '../FormDrawer';
import { PageHeader } from '../PageHeader';
import { ReferenceTypeaheadInput } from '../ReferenceTypeaheadInput';
import { useIdempotentSubmit } from '../../hooks/useIdempotentSubmit';

export function EmulsionListPage({
  processFilterCode,
  processFilterLabel
}: {
  processFilterCode?: string;
  processFilterLabel?: string;
} = {}) {
  const { api } = useSession();
  const [emulsions, setEmulsions] = useState<Emulsion[]>([]);
  const [formats, setFormats] = useState<FilmFormat[]>([]);
  const [processes, setProcesses] = useState<DevelopmentProcess[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const {
    beginSubmit: beginCreateSubmit,
    endSubmit: endCreateSubmit,
    idempotencyKeyRef: createIdempotencyKeyRef,
    isSubmitting: isCreating,
    resetSubmit: resetCreateSubmit
  } = useIdempotentSubmit();
  const [form, setForm] = useState({
    manufacturer: '',
    brand: '',
    isoSpeed: '400',
    developmentProcessId: '',
    filmFormatIds: [] as string[]
  });

  async function load() {
    setIsLoading(true);
    try {
      const [list, refs] = await Promise.all([api.getEmulsions(), api.getReferenceTables()]);
      setEmulsions(list);
      setFormats(refs.filmFormats);
      setProcesses(refs.developmentProcesses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emulsions');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!isCreateOpen) {
      resetCreateSubmit();
    }
  }, [isCreateOpen, resetCreateSubmit]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return emulsions.filter((emulsion) => {
      if (processFilterCode && emulsion.developmentProcess.code !== processFilterCode) return false;
      if (!q) return true;
      return `${emulsion.manufacturer} ${emulsion.brand} ${emulsion.isoSpeed}`.toLowerCase().includes(q);
    });
  }, [emulsions, processFilterCode, search]);

  const subtitle = processFilterLabel
    ? `Shared catalog filtered by ${processFilterLabel} process and search.`
    : 'Manage film emulsions and their format compatibility.';

  return (
    <main>
      <PageHeader
        heading="Emulsions"
        subtitle={subtitle}
        action={<button type="button" onClick={() => setCreateOpen(true)}>New emulsion</button>}
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      <section className="card">
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label htmlFor="emulsion-search">Search emulsions</label>
          <input id="emulsion-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Manufacturer, brand, ISO…" />
        </div>
      </section>

      <section className="card">
        {isLoading ? (
          <div>{[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-row" />)}</div>
        ) : visible.length === 0 ? (
          <div className="empty-state"><p>No emulsions found.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Emulsions matching the current filters</caption>
              <thead>
                <tr>
                  <th scope="col">Emulsion</th>
                  <th scope="col">ISO</th>
                  <th scope="col">Process</th>
                  <th scope="col">Formats</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((emulsion) => (
                  <tr key={emulsion.id}>
                    <td>
                      <Link href={`/emulsions/${emulsion.id}`} style={{ fontWeight: 600 }}>
                        {emulsion.manufacturer} {emulsion.brand}
                      </Link>
                    </td>
                    <td>{emulsion.isoSpeed}</td>
                    <td>{emulsion.developmentProcess.label}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted-ink)' }}>
                      {emulsion.filmFormats.map((format) => format.code).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading ? (
          <p style={{ fontSize: 13, color: 'var(--muted-ink)', margin: '10px 0 0' }}>
            {visible.length} emulsion{visible.length !== 1 ? 's' : ''}
          </p>
        ) : null}
      </section>

      <FormDrawer open={isCreateOpen} onClose={() => setCreateOpen(false)} title="New emulsion">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!beginCreateSubmit()) return;
          setError(null);
          try {
            const payload = createEmulsionRequestSchema.parse({
              manufacturer: form.manufacturer,
              brand: form.brand,
              isoSpeed: Number(form.isoSpeed),
              developmentProcessId: Number(form.developmentProcessId),
              filmFormatIds: form.filmFormatIds.map(Number)
            });
            await api.createEmulsion(payload, createIdempotencyKeyRef.current);
            setForm({ manufacturer: '', brand: '', isoSpeed: '400', developmentProcessId: '', filmFormatIds: [] });
            await load();
            setCreateOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create emulsion');
          } finally {
            endCreateSubmit();
          }
        }}>
          <fieldset disabled={isCreating} style={{ margin: 0, padding: 0, border: 'none' }}>
          <legend className="sr-only">New emulsion details</legend>
          <ReferenceTypeaheadInput
            id="new-em-manufacturer"
            label="Manufacturer"
            kind="manufacturer"
            value={form.manufacturer}
            onChange={(manufacturer) => setForm((p) => ({ ...p, manufacturer }))}
            required
          />
          <ReferenceTypeaheadInput
            id="new-em-brand"
            label="Brand / name"
            kind="brand"
            value={form.brand}
            onChange={(brand) => setForm((p) => ({ ...p, brand }))}
            required
          />
          <div className="form-field">
            <label htmlFor="new-em-iso">ISO speed</label>
            <input id="new-em-iso" type="number" value={form.isoSpeed} onChange={(e) => setForm((p) => ({ ...p, isoSpeed: e.target.value }))} required min={1} />
          </div>
          <div className="form-field">
            <label htmlFor="new-em-process">Development process</label>
            <select id="new-em-process" value={form.developmentProcessId} onChange={(e) => setForm((p) => ({ ...p, developmentProcessId: e.target.value }))} required>
              <option value="">Select process</option>
              {processes.map((proc) => <option key={proc.id} value={proc.id}>{proc.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <fieldset style={{ margin: 0, padding: 0, border: 'none' }}>
            <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-ink)' }}>Film formats</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', paddingTop: 4 }}>
              {formats.map((format) => (
                <label key={format.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto', margin: 0 }}
                    checked={form.filmFormatIds.includes(String(format.id))}
                    onChange={(e) => {
                      setForm((p) => ({
                        ...p,
                        filmFormatIds: e.target.checked
                          ? [...p.filmFormatIds, String(format.id)]
                          : p.filmFormatIds.filter((entry) => entry !== String(format.id))
                      }));
                    }}
                  />
                  {format.label}
                </label>
              ))}
            </div>
            </fieldset>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isCreating}>{isCreating ? 'Creating…' : 'Create'}</button>
            <button type="button" className="secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          </div>
          </fieldset>
        </form>
      </FormDrawer>
    </main>
  );
}

export function EmulsionDetailPage() {
  const { api } = useSession();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [emulsion, setEmulsion] = useState<Emulsion | null>(null);
  const [formats, setFormats] = useState<FilmFormat[]>([]);
  const [processes, setProcesses] = useState<DevelopmentProcess[]>([]);
  const [form, setForm] = useState({
    manufacturer: '',
    brand: '',
    isoSpeed: '400',
    developmentProcessId: '',
    filmFormatIds: [] as string[]
  });
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setEditOpen] = useState(false);
  const {
    beginSubmit: beginSaveSubmit,
    endSubmit: endSaveSubmit,
    idempotencyKeyRef: saveIdempotencyKeyRef,
    isSubmitting: isSaving,
    resetSubmit: resetSaveSubmit
  } = useIdempotentSubmit();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const {
    beginSubmit: beginDeleteSubmit,
    endSubmit: endDeleteSubmit,
    idempotencyKeyRef: deleteIdempotencyKeyRef,
    isSubmitting: isDeleting,
    resetSubmit: resetDeleteSubmit
  } = useIdempotentSubmit();

  async function load() {
    try {
      const [detail, refs] = await Promise.all([api.getEmulsion(id), api.getReferenceTables()]);
      setEmulsion(detail);
      setFormats(refs.filmFormats);
      setProcesses(refs.developmentProcesses);
      setForm({
        manufacturer: detail.manufacturer,
        brand: detail.brand,
        isoSpeed: String(detail.isoSpeed),
        developmentProcessId: String(detail.developmentProcessId),
        filmFormatIds: detail.filmFormats.map((format) => String(format.id))
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emulsion detail');
    }
  }

  useEffect(() => { if (Number.isFinite(id)) void load(); }, [id]);
  useEffect(() => {
    if (!isEditOpen) {
      resetSaveSubmit();
      resetDeleteSubmit();
    }
  }, [isEditOpen, resetDeleteSubmit, resetSaveSubmit]);

  const emulsionName = emulsion ? `${emulsion.manufacturer} ${emulsion.brand}` : '';

  return (
    <main>
      <Link href="/emulsions" className="back-link">
        <i className="bi bi-arrow-left" aria-hidden="true" />
        Back to emulsions
      </Link>

      <PageHeader
        heading={emulsionName || 'Emulsion Details'}
        subtitle={emulsion ? `ISO ${emulsion.isoSpeed} · ${emulsion.developmentProcess.label}` : undefined}
        action={
          emulsion ? (
            <button type="button" className="secondary" onClick={() => setEditOpen(true)}>Edit</button>
          ) : null
        }
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      {emulsion ? (
        <>
          <section className="card">
            <div className="detail-grid">
              <div className="detail-field">
                <span className="detail-label">Manufacturer</span>
                <span className="detail-value">{emulsion.manufacturer}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Brand</span>
                <span className="detail-value">{emulsion.brand}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">ISO</span>
                <span className="detail-value">{emulsion.isoSpeed}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Balance</span>
                <span className="detail-value">{emulsion.balance ?? '—'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Development process</span>
                <span className="detail-value">{emulsion.developmentProcess.label}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Compatible formats</span>
                <span className="detail-value">
                  {emulsion.filmFormats.map((format) => format.label).join(', ') || '—'}
                </span>
              </div>
            </div>
          </section>

          <FormDrawer open={isEditOpen} onClose={() => setEditOpen(false)} title="Edit emulsion">
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!beginSaveSubmit()) return;
              setError(null);
              try {
                const payload = updateEmulsionRequestSchema.parse({
                  manufacturer: form.manufacturer,
                  brand: form.brand,
                  isoSpeed: Number(form.isoSpeed),
                  developmentProcessId: Number(form.developmentProcessId),
                  filmFormatIds: form.filmFormatIds.map(Number)
                });
                await api.updateEmulsion(id, payload, saveIdempotencyKeyRef.current);
                await load();
                setEditOpen(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to update emulsion');
              } finally {
                endSaveSubmit();
              }
            }}>
              <fieldset disabled={isSaving} style={{ margin: 0, padding: 0, border: 'none' }}>
              <legend className="sr-only">Edit emulsion details</legend>
              <ReferenceTypeaheadInput
                id="edit-em-manufacturer"
                label="Manufacturer"
                kind="manufacturer"
                value={form.manufacturer}
                onChange={(manufacturer) => setForm((p) => ({ ...p, manufacturer }))}
                required
              />
              <ReferenceTypeaheadInput
                id="edit-em-brand"
                label="Brand / name"
                kind="brand"
                value={form.brand}
                onChange={(brand) => setForm((p) => ({ ...p, brand }))}
                required
              />
              <div className="form-field">
                <label htmlFor="edit-em-iso">ISO speed</label>
                <input id="edit-em-iso" type="number" value={form.isoSpeed} onChange={(e) => setForm((p) => ({ ...p, isoSpeed: e.target.value }))} required min={1} />
              </div>
              <div className="form-field">
                <label htmlFor="edit-em-process">Development process</label>
                <select id="edit-em-process" value={form.developmentProcessId} onChange={(e) => setForm((p) => ({ ...p, developmentProcessId: e.target.value }))} required>
                  {processes.map((proc) => <option key={proc.id} value={proc.id}>{proc.label}</option>)}
                </select>
              </div>
              <div className="form-field">
                <fieldset style={{ margin: 0, padding: 0, border: 'none' }}>
                <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-ink)' }}>Film formats</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', paddingTop: 4 }}>
                  {formats.map((format) => (
                    <label key={format.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                      <input
                        type="checkbox"
                        style={{ width: 'auto', margin: 0 }}
                        checked={form.filmFormatIds.includes(String(format.id))}
                        onChange={(e) => {
                          setForm((p) => ({
                            ...p,
                            filmFormatIds: e.target.checked
                              ? [...p.filmFormatIds, String(format.id)]
                              : p.filmFormatIds.filter((entry) => entry !== String(format.id))
                          }));
                        }}
                      />
                      {format.label}
                    </label>
                  ))}
                </div>
                </fieldset>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save'}</button>
                <button type="button" className="secondary" onClick={() => setEditOpen(false)}>Cancel</button>
              </div>

              <div className="danger-zone">
                <h3>Delete emulsion</h3>
                <p>Type <strong>{emulsionName}</strong> to confirm deletion.</p>
                <div className="form-field">
                  <label htmlFor="delete-em-confirm">Confirmation</label>
                  <input id="delete-em-confirm" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} />
                </div>
                <button
                  className="danger"
                  type="button"
                  disabled={deleteConfirmation !== emulsionName || isDeleting}
                  onClick={async () => {
                    if (!beginDeleteSubmit()) return;
                    try {
                      await api.deleteEmulsion(id, deleteIdempotencyKeyRef.current);
                      window.location.href = '/emulsions';
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to delete emulsion');
                    } finally {
                      endDeleteSubmit();
                    }
                  }}
                >
                  {isDeleting ? 'Deleting…' : 'Delete emulsion'}
                </button>
              </div>
              </fieldset>
            </form>
          </FormDrawer>
        </>
      ) : (
        !error ? (
          <div className="card">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton skeleton-row" />)}
          </div>
        ) : null
      )}
    </main>
  );
}
