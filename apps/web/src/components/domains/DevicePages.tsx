'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslation } from '@frollz2/i18n';
import { createFilmDeviceRequestSchema, filmFormatDefinitions, frameSizeCodeSchema, updateFilmDeviceRequestSchema } from '@frollz2/schema';
import type { CreateFilmDeviceRequest, DeviceLoadTimelineEvent, DeviceType, DeviceUsageInsights, FilmDevice, FilmFormat, FilmHolderSlot, FrameSizeCode, HolderType, InsightRange } from '@frollz2/schema';
import { useSession } from '../../auth/session';
import { resolveApiError } from '../../utils/resolve-api-error';
import { formatDate, toTitleCase } from '../../utils/format';
import { RangeToolbar } from '../RangeToolbar';
import { DeleteConfirmationName } from '../DeleteConfirmationName';
import { FormDrawer } from '../FormDrawer';
import { PageHeader } from '../PageHeader';
import { ReferenceTypeaheadInput } from '../ReferenceTypeaheadInput';
import { useIdempotentSubmit } from '../../hooks/useIdempotentSubmit';

type DeviceTypeCode = FilmDevice['deviceTypeCode'];

const DEVICE_TYPE_ROUTES: Record<DeviceTypeCode, string> = {
  camera: '/devices/cameras',
  interchangeable_back: '/devices/interchangeable-backs',
  film_holder: '/devices/film-holders'
};

const DEVICE_METER_COLORS: Record<DeviceTypeCode, string> = {
  camera: '#c49a3c',
  interchangeable_back: '#169d9b',
  film_holder: '#5e5851'
};

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

type DeviceMeterValue = {
  key: DeviceTypeCode;
  label: string;
  value: number;
  href: string;
  color: string;
};

function DeviceTypeMeterGroup({
  title,
  values
}: {
  title: string;
  values: DeviceMeterValue[];
}) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const visibleValues = values.filter((item) => item.value > 0);

  return (
    <section className="card" style={{ margin: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted-ink)', fontSize: 13 }}>{total} devices</p>
        </div>
      </div>

      <div
        role="meter"
        aria-label={`${title} device types`}
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
        {visibleValues.map((item) => (
          <div
            key={item.key}
            title={`${item.label}: ${item.value}`}
            style={{
              width: `${(item.value / total) * 100}%`,
              minWidth: item.value > 0 ? 3 : 0,
              background: item.color
            }}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 14 }}>
        {values.map((item) => (
          <Link key={item.key} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: item.color, flex: '0 0 auto' }} />
            <span style={{ color: 'var(--muted-ink)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            <strong style={{ marginLeft: 'auto', fontSize: 13 }}>{item.value}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DeviceDashboardPage() {
  const { t } = useTranslation();
  const { api } = useSession();
  const [devices, setDevices] = useState<FilmDevice[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [filmFormats, setFilmFormats] = useState<FilmFormat[]>([]);
  const [holderTypes, setHolderTypes] = useState<HolderType[]>([]);
  const [range, setRange] = useState<InsightRange>('365d');
  const [stats, setStats] = useState<DeviceUsageInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);

  const loadDevices = async () => {
    const list = await api.getDevices();
    setDevices(list);
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [list, refs] = await Promise.all([
          api.getDevices(),
          api.getReferenceTables()
        ]);
        setDevices(list);
        setDeviceTypes(refs.deviceTypes);
        setFilmFormats(refs.filmFormats);
        setHolderTypes(refs.holderTypes);
      } catch (err) {
        setError(resolveApiError(err, t, t('devices.failedToLoad')));
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [api, t]);

  useEffect(() => {
    api.getDeviceInsights({ range, limit: 50 })
      .then(setStats)
      .catch((err) => setError(resolveApiError(err, t, t('devices.failedToLoad'))));
  }, [api, range, t]);

  const meters = useMemo(() => {
    return filmFormats.map((format) => {
      const formatDevices = devices.filter((device) => device.filmFormatId === format.id);
      const values = (['camera', 'interchangeable_back', 'film_holder'] as DeviceTypeCode[]).map((typeCode) => ({
        key: typeCode,
        label: deviceTypes.find((type) => type.code === typeCode)?.label ?? deviceTypeCodeToLabel(typeCode),
        value: formatDevices.filter((device) => device.deviceTypeCode === typeCode).length,
        href: DEVICE_TYPE_ROUTES[typeCode],
        color: DEVICE_METER_COLORS[typeCode]
      }));
      return { key: format.id, title: format.label, values };
    });
  }, [devices, deviceTypes, filmFormats]);

  return (
    <main>
      <PageHeader
        heading={t('devices.heading')}
        subtitle={t('devices.dashboardSubtitle')}
        action={<button type="button" onClick={() => setCreateOpen(true)}>{t('devices.newDevice')}</button>}
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      <RangeToolbar range={range} onRangeChange={setRange} id="device-dashboard-range" />

      {isLoading ? (
        <div aria-busy="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}
        </div>
      ) : (
        <>
          <section style={{ marginBottom: 18 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>{t('devices.dashboardFormatsHeading')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {meters.map((meter) => (
                <DeviceTypeMeterGroup key={meter.key} title={meter.title} values={meter.values} />
              ))}
            </div>
          </section>

          {stats ? (
            <section className="card">
              <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>{t('devices.dashboardUsageHeading')}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{stats.totalDevices}</div>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted-ink)', fontSize: 13 }}>{t('devices.dashboardStats.totalDevices')}</p>
                </div>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{stats.activeLoads}</div>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted-ink)', fontSize: 13 }}>{t('devices.dashboardStats.activeLoads')}</p>
                </div>
              </div>
              {stats.rows.length === 0 ? (
                <div className="empty-state"><p>{t('devices.dashboardStats.noUsageData')}</p></div>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('devices.dashboardStats.columns.device')}</th>
                        <th>{t('devices.dashboardStats.columns.type')}</th>
                        <th>{t('devices.dashboardStats.columns.format')}</th>
                        <th>{t('devices.dashboardStats.columns.loads')}</th>
                        <th>{t('devices.dashboardStats.columns.active')}</th>
                        <th>{t('devices.dashboardStats.columns.lastLoaded')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.rows.map((row) => (
                        <tr key={row.deviceId}>
                          <td><Link href={`/devices/${row.deviceId}`}>{row.deviceName}</Link></td>
                          <td>{deviceTypes.find((type) => type.code === row.deviceTypeCode)?.label ?? deviceTypeCodeToLabel(row.deviceTypeCode)}</td>
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
              <p style={{ margin: '12px 0 0', color: 'var(--muted-ink)', fontSize: 13 }}>
                {t('devices.dashboardStats.generatedAt', { date: formatDate(stats.generatedAt) })}
              </p>
            </section>
          ) : null}
        </>
      )}
      <DeviceCreateDrawer
        open={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        deviceTypes={deviceTypes}
        filmFormats={filmFormats}
        holderTypes={holderTypes}
        onCreated={loadDevices}
      />
    </main>
  );
}

function DeviceCreateDrawer({
  open,
  onClose,
  deviceTypes,
  filmFormats,
  holderTypes,
  lockedDeviceTypeCode,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  deviceTypes: DeviceType[];
  filmFormats: FilmFormat[];
  holderTypes: HolderType[];
  lockedDeviceTypeCode?: DeviceTypeCode;
  onCreated: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const { api } = useSession();
  const {
    beginSubmit,
    endSubmit,
    idempotencyKeyRef,
    isSubmitting,
    resetSubmit
  } = useIdempotentSubmit();
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!open) {
      resetSubmit();
      setError(null);
    }
  }, [open, resetSubmit]);

  useEffect(() => {
    setForm((prev) => {
      const selectedType = deviceTypes.find((entry) => entry.code === prev.deviceTypeCode);
      return { ...prev, deviceTypeId: selectedType ? String(selectedType.id) : prev.deviceTypeId };
    });
  }, [deviceTypes]);

  useEffect(() => {
    if (!lockedDeviceTypeCode) return;
    const type = deviceTypes.find((entry) => entry.code === lockedDeviceTypeCode);
    setForm((prev) => ({
      ...prev,
      deviceTypeCode: lockedDeviceTypeCode,
      deviceTypeId: type ? String(type.id) : prev.deviceTypeId
    }));
  }, [deviceTypes, lockedDeviceTypeCode]);

  const selectedDeviceType = deviceTypes.find((entry) => entry.code === form.deviceTypeCode);
  const selectedFilmFormatCode = useMemo(() => {
    if (!form.filmFormatId) return '';
    return filmFormats.find((fmt) => String(fmt.id) === String(form.filmFormatId))?.code ?? '';
  }, [filmFormats, form.filmFormatId]);
  const availableFrameSizes = useMemo(() => {
    if (!selectedFilmFormatCode) return [];
    return filmFormatDefinitions[selectedFilmFormatCode]?.frameSizes ?? [];
  }, [selectedFilmFormatCode]);

  useEffect(() => {
    if (!form.frameSize) return;
    if (!availableFrameSizes.some((entry) => entry.code === form.frameSize)) {
      setForm((prev) => ({ ...prev, frameSize: '' }));
    }
  }, [availableFrameSizes, form.frameSize]);

  const isFrameSizeEnabled = Boolean(form.filmFormatId) && (form.deviceTypeCode !== 'camera' || form.isDirectLoadable);

  useEffect(() => {
    if (!isFrameSizeEnabled && form.frameSize) {
      setForm((prev) => ({ ...prev, frameSize: '' }));
    }
  }, [form.frameSize, isFrameSizeEnabled]);

  const isMakeEnabled = useMemo(() => {
    if (form.deviceTypeCode !== 'camera') return false;
    if (!form.isDirectLoadable) return true;
    return Boolean(form.filmFormatId);
  }, [form.deviceTypeCode, form.filmFormatId, form.isDirectLoadable]);

  return (
    <FormDrawer open={open} onClose={onClose} title={t('devices.newDevice')}>
      <form onSubmit={async (e) => {
        e.preventDefault();
        if (!beginSubmit()) return;
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
          await api.createDevice(payload, idempotencyKeyRef.current);
          await onCreated();
          onClose();
        } catch (err) {
          setError(resolveApiError(err, t, t('devices.failedToCreate')));
        } finally {
          endSubmit();
        }
      }}>
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        <fieldset disabled={isSubmitting} style={{ margin: 0, padding: 0, border: 'none' }}>
          <legend className="sr-only">{t('devices.form.newLegend')}</legend>
          <div className="form-field">
            <label htmlFor="new-device-type">{t('devices.form.deviceType')}</label>
            <select id="new-device-type" value={form.deviceTypeCode} onChange={(e) => {
              const nextCode = toDeviceTypeCode(e.target.value);
              const type = deviceTypes.find((entry) => entry.code === nextCode);
              setForm((prev) => ({ ...prev, deviceTypeCode: nextCode, deviceTypeId: type ? String(type.id) : '' }));
            }} disabled={Boolean(lockedDeviceTypeCode)}>
              {deviceTypes.map((type) => <option key={type.id} value={type.code}>{type.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-device-format">{t('devices.form.filmFormat')}</label>
            <select id="new-device-format" value={form.filmFormatId} onChange={(e) => setForm((prev) => ({ ...prev, filmFormatId: e.target.value }))} required>
              <option value="">{t('devices.form.selectFilmFormat')}</option>
              {filmFormats.map((fmt) => <option key={fmt.id} value={fmt.id}>{fmt.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-device-frame-size">{t('devices.form.frameSize')}</label>
            <select
              id="new-device-frame-size"
              value={form.frameSize}
              onChange={(e) => setForm((prev) => ({ ...prev, frameSize: e.target.value }))}
              disabled={!isFrameSizeEnabled}
            >
              <option value="">{t('devices.form.selectFrameSize')}</option>
              {availableFrameSizes.map((frameSize) => (
                <option key={frameSize.code} value={frameSize.code}>{frameSize.label}</option>
              ))}
            </select>
          </div>
          {form.deviceTypeCode === 'camera' ? (
            <>
              <div className="form-field form-field-toggle">
                <label htmlFor="new-device-direct-loadable" className="toggle-control">
                  <span>{t('devices.form.directLoadable')}</span>
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
                label={t('devices.form.make')}
                kind="device_make"
                value={form.make}
                onChange={(make) => setForm((prev) => ({ ...prev, make }))}
                required
                disabled={!isMakeEnabled}
              />
              <ReferenceTypeaheadInput
                id="new-device-model"
                label={t('devices.form.model')}
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
                <label htmlFor="new-device-name">{t('devices.form.name')}</label>
                <input id="new-device-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
              </div>
              <ReferenceTypeaheadInput
                id="new-device-system"
                label={t('devices.form.system')}
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
                <label htmlFor="new-holder-name">{t('devices.form.name')}</label>
                <input id="new-holder-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
              </div>
              <ReferenceTypeaheadInput
                id="new-holder-brand"
                label={t('devices.form.brand')}
                kind="brand"
                value={form.brand}
                onChange={(brand) => setForm((prev) => ({ ...prev, brand }))}
                required
              />
              <div className="form-field">
                <label htmlFor="new-holder-type">{t('devices.form.holderType')}</label>
                <select id="new-holder-type" value={form.holderTypeId} onChange={(e) => setForm((prev) => ({ ...prev, holderTypeId: e.target.value }))} required>
                  <option value="">{t('devices.form.selectHolderType')}</option>
                  {holderTypes.map((ht) => <option key={ht.id} value={ht.id}>{ht.label}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="new-holder-slot-count">{t('devices.form.slotCount')}</label>
                <select
                  id="new-holder-slot-count"
                  value={form.slotCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, slotCount: e.target.value }))}
                  required
                >
                  <option value="1">{t('devices.form.slot1')}</option>
                  <option value="2">{t('devices.form.slot2')}</option>
                </select>
              </div>
            </>
          ) : null}
          <div className="form-actions">
            <button type="submit" disabled={isSubmitting}>{isSubmitting ? t('devices.form.creating') : t('devices.form.create', { type: selectedDeviceType?.label ?? '' })}</button>
            <button type="button" className="secondary" onClick={onClose}>{t('devices.form.cancel')}</button>
          </div>
        </fieldset>
      </form>
    </FormDrawer>
  );
}

export function DeviceListPage({ lockedDeviceTypeCode }: { lockedDeviceTypeCode?: DeviceTypeCode } = {}) {
  const { t } = useTranslation();
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

  async function load() {
    setIsLoading(true);
    try {
      const [list, refs] = await Promise.all([api.getDevices(), api.getReferenceTables()]);
      setDevices(list);
      setDeviceTypes(refs.deviceTypes);
      setFilmFormats(refs.filmFormats);
      setHolderTypes(refs.holderTypes);
    } catch (err) {
      setError(resolveApiError(err, t, t('devices.failedToLoad')));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((device) => {
      if (typeFilter && device.deviceTypeCode !== typeFilter) return false;
      if (!q) return true;
      return `${deviceDisplayName(device)} ${device.deviceTypeCode}`.toLowerCase().includes(q);
    });
  }, [devices, search, typeFilter]);

  const typeLabel = typeFilter
    ? deviceTypes.find((t) => t.code === typeFilter)?.label ?? deviceTypeCodeToLabel(typeFilter)
    : null;

  const heading = typeLabel ?? t('devices.heading');
  const subtitle = typeLabel
    ? t('devices.filteredSubtitle', { type: typeLabel })
    : t('devices.subtitle');

  return (
    <main>
      <PageHeader
        heading={heading}
        subtitle={subtitle}
        action={<button type="button" onClick={() => setCreateOpen(true)}>{t('devices.newDevice')}</button>}
      />

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      <section className="card">
        <div className="filter-bar">
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="device-search">{t('devices.searchLabel')}</label>
            <input id="device-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('devices.searchPlaceholder')} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="device-type-filter">{t('devices.typeFilter')}</label>
            <select id="device-type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} disabled={Boolean(lockedDeviceTypeCode)}>
              <option value="">{t('devices.allTypes')}</option>
              {deviceTypes.map((type) => <option key={type.id} value={type.code}>{type.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        {isLoading ? (
          <div>{[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-row" />)}</div>
        ) : visible.length === 0 ? (
          <div className="empty-state"><p>{t('devices.noDevicesFound')}</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">{t('devices.tableCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('devices.columns.device')}</th>
                  <th scope="col">{t('devices.columns.type')}</th>
                  <th scope="col">{t('devices.columns.format')}</th>
                  <th scope="col">{t('devices.columns.frameSize')}</th>
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
            {t('devices.count', { count: visible.length })}
          </p>
        ) : null}
      </section>

      <DeviceCreateDrawer
        open={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        deviceTypes={deviceTypes}
        filmFormats={filmFormats}
        holderTypes={holderTypes}
        {...(lockedDeviceTypeCode ? { lockedDeviceTypeCode } : {})}
        onCreated={load}
      />
    </main>
  );
}

export function DeviceDetailPage() {
  const { t } = useTranslation();
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
      setError(resolveApiError(err, t, t('devices.failedToLoad')));
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
        {t('devices.backToDevices')}
      </Link>

      <PageHeader
        heading={displayName || t('devices.deviceDetails')}
        subtitle={device
          ? `${deviceTypeCodeToLabel(device.deviceTypeCode)}${device.frameSize ? ` · ${resolveFrameSizeLabel(device.frameSize)}` : ''}`
          : undefined}
        action={
          device ? (
            <button type="button" className="secondary" onClick={() => setEditOpen(true)}>{t('devices.editButton')}</button>
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
                    <span className="detail-label">{t('devices.detail.make')}</span>
                    <span className="detail-value">{device.make}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">{t('devices.detail.model')}</span>
                    <span className="detail-value">{device.model}</span>
                  </div>
                </>
              ) : (
                <div className="detail-field">
                  <span className="detail-label">{t('devices.detail.name')}</span>
                  <span className="detail-value">{device.name}</span>
                </div>
              )}
              <div className="detail-field">
                <span className="detail-label">{t('devices.detail.type')}</span>
                <span className="detail-value">{deviceTypeCodeToLabel(device.deviceTypeCode)}</span>
              </div>
              {device.frameSize ? (
                <div className="detail-field">
                  <span className="detail-label">{t('devices.detail.frameSize')}</span>
                  <span className="detail-value">{resolveFrameSizeLabel(device.frameSize)}</span>
                </div>
              ) : null}
              {device.deviceTypeCode === 'interchangeable_back' ? (
                <div className="detail-field">
                  <span className="detail-label">{t('devices.detail.system')}</span>
                  <span className="detail-value">{device.system}</span>
                </div>
              ) : null}
              {device.deviceTypeCode === 'film_holder' ? (
                <div className="detail-field">
                  <span className="detail-label">{t('devices.detail.brand')}</span>
                  <span className="detail-value">{device.brand}</span>
                </div>
              ) : null}
            </div>
          </section>

          {device.deviceTypeCode === 'film_holder' ? (
            <section className="card">
              <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>{t('devices.slots.heading')}</h2>
              {slots.length === 0 ? (
                <p className="field-help">{t('devices.slots.noSlots')}</p>
              ) : (
                <div className="table-scroll">
                <table>
                  <caption className="sr-only">{t('devices.slots.tableCaption', { name: displayName })}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('devices.slots.columns.side')}</th>
                      <th scope="col">{t('devices.slots.columns.state')}</th>
                      <th scope="col">{t('devices.slots.columns.loadedFilm')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot.id}>
                        <td>{slot.sideNumber}</td>
                        <td>{slot.slotStateCode}</td>
                        <td>{slot.loadedFilmId ?? t('devices.slots.none')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </section>
          ) : null}

          <section className="card">
            <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>{t('devices.timeline.heading')}</h2>
            {loadEvents.length === 0 ? (
              <p className="field-help">{t('devices.timeline.noEvents')}</p>
            ) : (
              <div className="table-scroll">
              <table>
                <caption className="sr-only">{t('devices.timeline.tableCaption', { name: displayName })}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('devices.timeline.columns.film')}</th>
                    <th scope="col">{t('devices.timeline.columns.emulsion')}</th>
                    <th scope="col">{t('devices.timeline.columns.loadedAt')}</th>
                    <th scope="col">{t('devices.timeline.columns.removedAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadEvents.map((event) => (
                    <tr key={event.eventId}>
                      <td>{event.filmName}</td>
                      <td>{event.emulsionName}</td>
                      <td>{new Date(event.occurredAt).toLocaleString()}</td>
                      <td>{event.removedAt ? new Date(event.removedAt).toLocaleString() : t('devices.timeline.active')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>

          <FormDrawer open={isEditOpen} onClose={() => setEditOpen(false)} title={t('devices.form.editLegend')}>
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
                setError(resolveApiError(err, t, t('devices.failedToUpdate')));
              } finally {
                endEditSubmit();
              }
            }}>
              <fieldset disabled={isSaving} style={{ margin: 0, padding: 0, border: 'none' }}>
              <legend className="sr-only">{t('devices.form.editLegend')}</legend>
              {isCamera ? (
                <>
                  <ReferenceTypeaheadInput
                    id="edit-device-make"
                    label={t('devices.form.make')}
                    kind="device_make"
                    value={editMake}
                    onChange={setEditMake}
                    required
                  />
                  <ReferenceTypeaheadInput
                    id="edit-device-model"
                    label={t('devices.form.model')}
                    kind="device_model"
                    value={editModel}
                    onChange={setEditModel}
                    required
                  />
                </>
              ) : (
                <div className="form-field">
                  <label htmlFor="edit-device-name">{t('devices.form.name')}</label>
                  <input id="edit-device-name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
              )}
              <div className="form-actions">
                <button type="submit" disabled={isSaving}>{isSaving ? t('devices.form.saving') : t('devices.form.save')}</button>
                <button type="button" className="secondary" onClick={() => setEditOpen(false)}>{t('devices.form.cancel')}</button>
              </div>

              <div className="danger-zone">
                <h3>{t('devices.delete.heading')}</h3>
                <p>{t('devices.delete.confirmationPrompt')}</p>
                <DeleteConfirmationName name={displayName} />
                <div className="form-field">
                  <label htmlFor="delete-device-confirm">{t('devices.delete.confirmLabel')}</label>
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
                      setError(resolveApiError(err, t, t('devices.failedToDelete')));
                    } finally {
                      endDeleteSubmit();
                    }
                  }}
                >
                  {isDeleting ? t('devices.delete.deleting') : t('devices.delete.delete')}
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
