'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createFilmDeviceRequestSchema, filmFormatDefinitions, frameSizeCodeSchema, updateFilmDeviceRequestSchema } from '@frollz2/schema';
import type { CreateFilmDeviceRequest, DeviceLoadTimelineEvent, DeviceType, FilmDevice, FilmFormat, FilmHolderSlot, FrameSizeCode, HolderType } from '@frollz2/schema';
import { useSession } from '../../auth/session';
import { FormDrawer } from '../FormDrawer';
import { PageHeader } from '../PageHeader';
import { ReferenceTypeaheadInput } from '../ReferenceTypeaheadInput';
import { useIdempotentSubmit } from '../../hooks/useIdempotentSubmit';

type DeviceTypeCode = FilmDevice['deviceTypeCode'];

type DeviceCreateForm = {
  deviceTypeCode: DeviceTypeCode;
  deviceTypeId: string;
  filmFormatId: string;
  frameSize: string;
  isDirectLoadable: boolean;
  make: string;
  model: string;
  name: string;
  system: string;
  brand: string;
  holderTypeId: string;
  slotCount: string;
};

function deviceDisplayName(device: FilmDevice): string {
  return device.deviceTypeCode === 'camera' ? `${device.make} ${device.model}` : device.name;
}

function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function frameSizeCodeToTitle(value: string): string {
  return toTitleCase(value.replace(/_/g, ' '));
}

function deviceTypeCodeToLabel(value: string): string {
  return toTitleCase(value.replace(/_/g, ' '));
}

const frameSizeLabelByCode = new Map<string, string>();
Object.values(filmFormatDefinitions).forEach((definition) => {
  definition.frameSizes.forEach((entry) => {
    if (!frameSizeLabelByCode.has(entry.code)) {
      frameSizeLabelByCode.set(entry.code, frameSizeCodeToTitle(entry.label));
    }
  });
});

function resolveFrameSizeLabel(frameSizeCode?: string | null): string {
  if (!frameSizeCode) return '—';
  return frameSizeLabelByCode.get(frameSizeCode) ?? frameSizeCodeToTitle(frameSizeCode);
}

function toDeviceTypeCode(value: string): DeviceTypeCode {
  if (value === 'camera' || value === 'interchangeable_back' || value === 'film_holder') {
    return value;
  }

  return 'camera';
}

function parseFrameSize(value: string): FrameSizeCode {
  return frameSizeCodeSchema.parse(value);
}

export function DeviceListPage({ lockedDeviceTypeCode }: { lockedDeviceTypeCode?: DeviceTypeCode } = {}) {
  const { api } = useSession();
  const searchParams = useSearchParams();
  const typeFilterParam = searchParams?.get('type') ?? '';
  const effectiveTypeFilter = lockedDeviceTypeCode ?? typeFilterParam;

  const [devices, setDevices] = useState<FilmDevice[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [filmFormats, setFilmFormats] = useState<FilmFormat[]>([]);
  const [holderTypes, setHolderTypes] = useState<HolderType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(effectiveTypeFilter);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setTypeFilter(effectiveTypeFilter); }, [effectiveTypeFilter]);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const {
    beginSubmit: beginCreateSubmit,
    endSubmit: endCreateSubmit,
    idempotencyKeyRef: createIdempotencyKeyRef,
    isSubmitting: isCreating,
    resetSubmit: resetCreateSubmit
  } = useIdempotentSubmit();
  const [form, setForm] = useState<DeviceCreateForm>({
    deviceTypeCode: 'camera',
    deviceTypeId: '',
    filmFormatId: '',
    frameSize: '',
    isDirectLoadable: true,
    make: '',
    model: '',
    name: '',
    system: '',
    brand: '',
    holderTypeId: '',
    slotCount: '2'
  });

  async function load() {
    setIsLoading(true);
    try {
      const [list, refs] = await Promise.all([api.getDevices(), api.getReferenceTables()]);
      setDevices(list);
      setDeviceTypes(refs.deviceTypes);
      setFilmFormats(refs.filmFormats);
      setHolderTypes(refs.holderTypes);
      setForm((prev) => {
        if (prev.deviceTypeId) return prev;
        const selectedType = refs.deviceTypes.find((entry) => entry.code === prev.deviceTypeCode);
        return { ...prev, deviceTypeId: selectedType ? String(selectedType.id) : '' };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!lockedDeviceTypeCode) return;
    const type = deviceTypes.find((entry) => entry.code === lockedDeviceTypeCode);
    setForm((prev) => ({
      ...prev,
      deviceTypeCode: lockedDeviceTypeCode,
      deviceTypeId: type ? String(type.id) : prev.deviceTypeId
    }));
  }, [deviceTypes, lockedDeviceTypeCode]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((device) => {
      if (typeFilter && device.deviceTypeCode !== typeFilter) return false;
      if (!q) return true;
      return `${deviceDisplayName(device)} ${device.deviceTypeCode}`.toLowerCase().includes(q);
    });
  }, [devices, search, typeFilter]);

  const selectedDeviceType = deviceTypes.find((entry) => entry.code === form.deviceTypeCode);
  const selectedFilmFormatCode = useMemo(() => {
    if (!form.filmFormatId) return '';
    const selected = filmFormats.find((fmt) => String(fmt.id) === String(form.filmFormatId));
    return selected?.code ?? '';
  }, [filmFormats, form.filmFormatId]);
  const availableFrameSizes = useMemo(() => {
    if (!selectedFilmFormatCode) return [];
    return filmFormatDefinitions[selectedFilmFormatCode]?.frameSizes ?? [];
  }, [selectedFilmFormatCode]);

  useEffect(() => {
    if (!form.frameSize) return;
    const stillValid = availableFrameSizes.some((entry) => entry.code === form.frameSize);
    if (!stillValid) {
      setForm((prev) => ({ ...prev, frameSize: '' }));
    }
  }, [availableFrameSizes, form.frameSize]);
  const isFrameSizeEnabled = Boolean(form.filmFormatId) && (form.deviceTypeCode !== 'camera' || form.isDirectLoadable);

  useEffect(() => {
    if (isFrameSizeEnabled) return;
    if (!form.frameSize) return;
    setForm((prev) => ({ ...prev, frameSize: '' }));
  }, [form.frameSize, isFrameSizeEnabled]);

  const isMakeEnabled = useMemo(() => {
    if (form.deviceTypeCode !== 'camera') return false;
    if (!form.deviceTypeCode) return false;
    if (!form.isDirectLoadable) return true;
    return Boolean(form.filmFormatId);
  }, [form.deviceTypeCode, form.filmFormatId, form.isDirectLoadable]);

  useEffect(() => {
    if (!isCreateOpen) {
      resetCreateSubmit();
    }
  }, [isCreateOpen, resetCreateSubmit]);

  const typeLabel = typeFilter
    ? deviceTypes.find((t) => t.code === typeFilter)?.label ?? deviceTypeCodeToLabel(typeFilter)
    : null;

  const heading = typeLabel ?? 'Devices';
  const subtitle = typeLabel
    ? `Filtered view for ${typeLabel}.`
    : 'Cameras, backs, and film holders.';

  return (
    <main>
      <PageHeader
        heading={heading}
        subtitle={subtitle}
        action={<button type="button" onClick={() => setCreateOpen(true)}>New device</button>}
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      <section className="card">
        <div className="filter-bar">
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="device-search">Search devices</label>
            <input id="device-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Make, model, name…" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="device-type-filter">Device type</label>
            <select id="device-type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} disabled={Boolean(lockedDeviceTypeCode)}>
              <option value="">All types</option>
              {deviceTypes.map((type) => <option key={type.id} value={type.code}>{type.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        {isLoading ? (
          <div>{[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-row" />)}</div>
        ) : visible.length === 0 ? (
          <div className="empty-state"><p>No devices match your filters.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Devices matching the current filters</caption>
              <thead>
                <tr>
                  <th scope="col">Device</th>
                  <th scope="col">Type</th>
                  <th scope="col">Format</th>
                  <th scope="col">Frame size</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((device) => (
                  <tr key={device.id}>
                    <td>
                      <Link href={`/devices/${device.id}`} style={{ fontWeight: 600 }}>
                        {deviceDisplayName(device)}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--muted-ink)', fontSize: 13 }}>
                      {deviceTypes.find((t) => t.code === device.deviceTypeCode)?.label ?? device.deviceTypeCode}
                    </td>
                    <td style={{ fontSize: 13 }}>{filmFormats.find((f) => f.id === device.filmFormatId)?.label ?? '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted-ink)' }}>{resolveFrameSizeLabel(device.frameSize)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading ? (
          <p style={{ fontSize: 13, color: 'var(--muted-ink)', margin: '10px 0 0' }}>
            {visible.length} device{visible.length !== 1 ? 's' : ''}
          </p>
        ) : null}
      </section>

      <FormDrawer open={isCreateOpen} onClose={() => setCreateOpen(false)} title="New device">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!beginCreateSubmit()) return;
          setError(null);
          try {
            const deviceTypeId = Number(form.deviceTypeId);
            const filmFormatId = Number(form.filmFormatId);
            let rawPayload: CreateFilmDeviceRequest;
            if (form.deviceTypeCode === 'camera') {
              rawPayload = {
                deviceTypeCode: 'camera',
                deviceTypeId,
                filmFormatId,
                frameSize: form.isDirectLoadable && form.frameSize ? parseFrameSize(form.frameSize) : null,
                make: toTitleCase(form.make),
                model: form.model,
                loadMode: form.isDirectLoadable ? 'direct' : 'interchangeable_back',
                canUnload: true
              };
            } else if (form.deviceTypeCode === 'interchangeable_back') {
              rawPayload = {
                deviceTypeCode: 'interchangeable_back',
                deviceTypeId,
                filmFormatId,
                frameSize: parseFrameSize(form.frameSize),
                name: form.name,
                system: form.system
              };
            } else {
              rawPayload = {
                deviceTypeCode: 'film_holder',
                deviceTypeId,
                filmFormatId,
                frameSize: parseFrameSize(form.frameSize),
                name: form.name,
                brand: form.brand,
                holderTypeId: Number(form.holderTypeId),
                slotCount: Number(form.slotCount) === 1 ? 1 : 2
              };
            }

            const payload = createFilmDeviceRequestSchema.parse(rawPayload);
            await api.createDevice(payload, createIdempotencyKeyRef.current);
            await load();
            setCreateOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create device');
          } finally {
            endCreateSubmit();
          }
        }}>
          <fieldset disabled={isCreating} style={{ margin: 0, padding: 0, border: 'none' }}>
          <legend className="sr-only">New device details</legend>
          <div className="form-field">
            <label htmlFor="new-device-type">Device type</label>
            <select id="new-device-type" value={form.deviceTypeCode} onChange={(e) => {
              const nextCode = toDeviceTypeCode(e.target.value);
              const type = deviceTypes.find((entry) => entry.code === nextCode);
              setForm((prev) => ({ ...prev, deviceTypeCode: nextCode, deviceTypeId: type ? String(type.id) : '' }));
            }} disabled={Boolean(lockedDeviceTypeCode)}>
              {deviceTypes.map((type) => <option key={type.id} value={type.code}>{type.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-device-format">Film format</label>
            <select id="new-device-format" value={form.filmFormatId} onChange={(e) => setForm((prev) => ({ ...prev, filmFormatId: e.target.value }))} required>
              <option value="">Select film format</option>
              {filmFormats.map((fmt) => <option key={fmt.id} value={fmt.id}>{fmt.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-device-frame-size">Frame size</label>
            <select
              id="new-device-frame-size"
              value={form.frameSize}
              onChange={(e) => setForm((prev) => ({ ...prev, frameSize: e.target.value }))}
              disabled={!isFrameSizeEnabled}
            >
              <option value="">Select frame size</option>
              {availableFrameSizes.map((frameSize) => (
                <option key={frameSize.code} value={frameSize.code}>{frameSize.label}</option>
              ))}
            </select>
          </div>

          {form.deviceTypeCode === 'camera' ? (
            <>
              <div className="form-field form-field-toggle">
                <label htmlFor="new-device-direct-loadable" className="toggle-control">
                  <span>Is this camera directly loadable?</span>
                  <span className="switch">
                    <input
                      id="new-device-direct-loadable"
                      type="checkbox"
                      checked={Boolean(form.isDirectLoadable)}
                      onChange={(e) => setForm((prev) => ({ ...prev, isDirectLoadable: e.target.checked }))}
                    />
                    <span className="switch-slider" aria-hidden="true" />
                  </span>
                </label>
              </div>
              <ReferenceTypeaheadInput
                id="new-device-make"
                label="Make"
                kind="device_make"
                value={form.make}
                onChange={(make) => setForm((prev) => ({ ...prev, make }))}
                required
                disabled={!isMakeEnabled}
              />
              <ReferenceTypeaheadInput
                id="new-device-model"
                label="Model"
                kind="device_model"
                value={form.model}
                onChange={(model) => setForm((prev) => ({ ...prev, model }))}
                required
              />
            </>
          ) : null}

          {form.deviceTypeCode === 'interchangeable_back' ? (
            <>
              <div className="form-field">
                <label htmlFor="new-device-name">Name</label>
                <input id="new-device-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
              </div>
              <ReferenceTypeaheadInput
                id="new-device-system"
                label="System"
                kind="device_system"
                value={form.system}
                onChange={(system) => setForm((prev) => ({ ...prev, system }))}
                required
              />
            </>
          ) : null}

          {form.deviceTypeCode === 'film_holder' ? (
            <>
              <div className="form-field">
                <label htmlFor="new-holder-name">Name</label>
                <input id="new-holder-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
              </div>
              <ReferenceTypeaheadInput
                id="new-holder-brand"
                label="Brand"
                kind="brand"
                value={form.brand}
                onChange={(brand) => setForm((prev) => ({ ...prev, brand }))}
                required
              />
              <div className="form-field">
                <label htmlFor="new-holder-type">Holder type</label>
                <select id="new-holder-type" value={form.holderTypeId} onChange={(e) => setForm((prev) => ({ ...prev, holderTypeId: e.target.value }))} required>
                  <option value="">Select holder type</option>
                  {holderTypes.map((ht) => <option key={ht.id} value={ht.id}>{ht.label}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="new-holder-slot-count">Slot count</label>
                <select
                  id="new-holder-slot-count"
                  value={form.slotCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, slotCount: e.target.value }))}
                  required
                >
                  <option value="1">1 slot</option>
                  <option value="2">2 slots</option>
                </select>
              </div>
            </>
          ) : null}

          <div className="form-actions">
            <button type="submit" disabled={isCreating}>{isCreating ? 'Creating…' : `Create ${selectedDeviceType?.label ?? 'device'}`}</button>
            <button type="button" className="secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          </div>
          </fieldset>
        </form>
      </FormDrawer>
    </main>
  );
}

export function DeviceDetailPage() {
  const { api } = useSession();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [device, setDevice] = useState<FilmDevice | null>(null);
  const [slots, setSlots] = useState<FilmHolderSlot[]>([]);
  const [loadEvents, setLoadEvents] = useState<DeviceLoadTimelineEvent[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMake, setEditMake] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editName, setEditName] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isEditOpen, setEditOpen] = useState(false);
  const {
    beginSubmit: beginEditSubmit,
    endSubmit: endEditSubmit,
    idempotencyKeyRef: editIdempotencyKeyRef,
    isSubmitting: isSaving,
    resetSubmit: resetEditSubmit
  } = useIdempotentSubmit();
  const {
    beginSubmit: beginDeleteSubmit,
    endSubmit: endDeleteSubmit,
    idempotencyKeyRef: deleteIdempotencyKeyRef,
    isSubmitting: isDeleting,
    resetSubmit: resetDeleteSubmit
  } = useIdempotentSubmit();

  async function load() {
    setIsLoadingDetail(true);
    try {
      const [detail, loadEventsResponse] = await Promise.all([
        api.getDevice(id),
        api.getDeviceLoadEvents(id)
      ]);
      setDevice(detail);
      setLoadEvents(loadEventsResponse);
      setSlots(detail.deviceTypeCode === 'film_holder' && Array.isArray(detail.slots) ? detail.slots : []);
      if (detail.deviceTypeCode === 'camera') {
        setEditMake(detail.make);
        setEditModel(detail.model);
      } else {
        setEditName(detail.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load device detail');
      setDevice(null);
      setSlots([]);
      setLoadEvents([]);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  useEffect(() => { if (Number.isFinite(id)) void load(); }, [id]);
  useEffect(() => {
    if (!isEditOpen) {
      resetEditSubmit();
      resetDeleteSubmit();
    }
  }, [isEditOpen, resetDeleteSubmit, resetEditSubmit]);

  const displayName = device ? deviceDisplayName(device) : '';
  const isCamera = device?.deviceTypeCode === 'camera';

  return (
    <main>
      <Link href="/devices" className="back-link">
        <i className="bi bi-arrow-left" aria-hidden="true" />
        Back to devices
      </Link>

      <PageHeader
        heading={displayName || 'Device Details'}
        subtitle={device
          ? `${deviceTypeCodeToLabel(device.deviceTypeCode)}${device.frameSize ? ` · ${resolveFrameSizeLabel(device.frameSize)}` : ''}`
          : undefined}
        action={
          device ? (
            <button type="button" className="secondary" onClick={() => setEditOpen(true)}>Edit</button>
          ) : null
        }
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      {device ? (
        <>
          <section className="card">
            <div className="detail-grid">
              {isCamera ? (
                <>
                  <div className="detail-field">
                    <span className="detail-label">Make</span>
                    <span className="detail-value">{device.make}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Model</span>
                    <span className="detail-value">{device.model}</span>
                  </div>
                </>
              ) : (
                <div className="detail-field">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{device.name}</span>
                </div>
              )}
              <div className="detail-field">
                <span className="detail-label">Type</span>
                <span className="detail-value">{deviceTypeCodeToLabel(device.deviceTypeCode)}</span>
              </div>
              {device.frameSize ? (
                <div className="detail-field">
                  <span className="detail-label">Frame size</span>
                  <span className="detail-value">{resolveFrameSizeLabel(device.frameSize)}</span>
                </div>
              ) : null}
              {device.deviceTypeCode === 'interchangeable_back' ? (
                <div className="detail-field">
                  <span className="detail-label">System</span>
                  <span className="detail-value">{device.system}</span>
                </div>
              ) : null}
              {device.deviceTypeCode === 'film_holder' ? (
                <div className="detail-field">
                  <span className="detail-label">Brand</span>
                  <span className="detail-value">{device.brand}</span>
                </div>
              ) : null}
            </div>
          </section>

          {device.deviceTypeCode === 'film_holder' ? (
            <section className="card">
              <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Film holder slots</h2>
              {slots.length === 0 ? (
                <p className="field-help">No slot information available.</p>
              ) : (
                <div className="table-scroll">
                <table>
                  <caption className="sr-only">Film holder slots for {displayName}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Side</th>
                      <th scope="col">State</th>
                      <th scope="col">Loaded film</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot.id}>
                        <td>{slot.sideNumber}</td>
                        <td>{slot.slotStateCode}</td>
                        <td>{slot.loadedFilmId ?? 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </section>
          ) : null}

          <section className="card">
            <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Load timeline</h2>
            {loadEvents.length === 0 ? (
              <p className="field-help">No load timeline events available.</p>
            ) : (
              <div className="table-scroll">
              <table>
                <caption className="sr-only">Load timeline for {displayName}</caption>
                <thead>
                  <tr>
                    <th scope="col">Film</th>
                    <th scope="col">Emulsion</th>
                    <th scope="col">Loaded at</th>
                    <th scope="col">Removed at</th>
                  </tr>
                </thead>
                <tbody>
                  {loadEvents.map((event) => (
                    <tr key={event.eventId}>
                      <td>{event.filmName}</td>
                      <td>{event.emulsionName}</td>
                      <td>{new Date(event.occurredAt).toLocaleString()}</td>
                      <td>{event.removedAt ? new Date(event.removedAt).toLocaleString() : 'Active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>

          <FormDrawer open={isEditOpen} onClose={() => setEditOpen(false)} title="Edit device">
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!beginEditSubmit()) return;
              setError(null);
              try {
                const payload = updateFilmDeviceRequestSchema.parse(
                  isCamera ? { make: editMake, model: editModel } : { name: editName }
                );
                await api.updateDevice(id, payload, editIdempotencyKeyRef.current);
                await load();
                setEditOpen(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to update device');
              } finally {
                endEditSubmit();
              }
            }}>
              <fieldset disabled={isSaving} style={{ margin: 0, padding: 0, border: 'none' }}>
              <legend className="sr-only">Edit device details</legend>
              {isCamera ? (
                <>
                  <ReferenceTypeaheadInput
                    id="edit-device-make"
                    label="Make"
                    kind="device_make"
                    value={editMake}
                    onChange={setEditMake}
                    required
                  />
                  <ReferenceTypeaheadInput
                    id="edit-device-model"
                    label="Model"
                    kind="device_model"
                    value={editModel}
                    onChange={setEditModel}
                    required
                  />
                </>
              ) : (
                <div className="form-field">
                  <label htmlFor="edit-device-name">Name</label>
                  <input id="edit-device-name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
              )}
              <div className="form-actions">
                <button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save'}</button>
                <button type="button" className="secondary" onClick={() => setEditOpen(false)}>Cancel</button>
              </div>

              <div className="danger-zone">
                <h3>Delete device</h3>
                <p>Type <strong>{displayName}</strong> to confirm deletion.</p>
                <div className="form-field">
                  <label htmlFor="delete-device-confirm">Confirmation</label>
                  <input id="delete-device-confirm" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} />
                </div>
                <button
                  className="danger"
                  type="button"
                  disabled={!displayName || deleteConfirmation !== displayName || isDeleting}
                  onClick={async () => {
                    if (!beginDeleteSubmit()) return;
                    try {
                      await api.deleteDevice(id, deleteIdempotencyKeyRef.current);
                      window.location.href = '/devices';
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to delete device');
                    } finally {
                      endDeleteSubmit();
                    }
                  }}
                >
                  {isDeleting ? 'Deleting…' : 'Delete device'}
                </button>
              </div>
              </fieldset>
            </form>
          </FormDrawer>
        </>
      ) : (
        !error && isLoadingDetail ? (
          <div className="card">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton skeleton-row" />)}
          </div>
        ) : null
      )}
    </main>
  );
}
