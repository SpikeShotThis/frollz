'use client';

import { useEffect, useState } from 'react';
import {
  LIST_MAX_LIMIT,
  createFilmJourneyEventRequestSchema,
  createFilmLabRequestSchema,
  filmJourneyEventPayloadSchema,
  filmTransitionMap
} from '@frollz2/schema';
import type { FilmDevice, FilmState, ReferenceTables } from '@frollz2/schema';
import { useSession } from '../auth/session';
import { useIdempotencyKey, useIdempotentSubmit } from '../hooks/useIdempotentSubmit';
import { ReferenceTypeaheadInput } from './ReferenceTypeaheadInput';

type EventData = Record<string, unknown>;

interface FilmEventFormProps {
  filmId: number;
  filmFormatId: number;
  currentStateCode: string;
  availableStates: FilmState[];
  refTables: ReferenceTables;
  onEventAdded: () => void;
}

function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function deviceTypeCodeToLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

function LoadedSubForm({
  filmFormatId,
  onChange
}: {
  filmFormatId: number;
  refTables?: ReferenceTables;
  onChange: (data: EventData) => void;
}) {
  const { api } = useSession();
  const [devices, setDevices] = useState<FilmDevice[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [slotNumber, setSlotNumber] = useState('1');
  const [intendedPushPull, setIntendedPushPull] = useState('');

  useEffect(() => {
    void api.getDevices().then(setDevices);
  }, [api]);

  const compatibleDevices = devices.filter((d) => d.filmFormatId === filmFormatId);
  const selectedDevice = compatibleDevices.find((d) => String(d.id) === deviceId);

  useEffect(() => {
    if (!selectedDevice) return;
    const push = intendedPushPull ? Number(intendedPushPull) : null;
    let data: EventData;
    if (selectedDevice.deviceTypeCode === 'camera') {
      data = { loadTargetType: 'camera_direct', cameraId: selectedDevice.id, intendedPushPull: push };
    } else if (selectedDevice.deviceTypeCode === 'interchangeable_back') {
      data = { loadTargetType: 'interchangeable_back', interchangeableBackId: selectedDevice.id, intendedPushPull: push };
    } else {
      data = { loadTargetType: 'film_holder_slot', filmHolderId: selectedDevice.id, slotNumber: Number(slotNumber), intendedPushPull: push };
    }
    onChange(data);
  }, [deviceId, intendedPushPull, onChange, selectedDevice, slotNumber]);

  return (
    <>
      <div className="form-field">
        <label htmlFor="ef-device">Device</label>
        <select id="ef-device" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required aria-describedby={compatibleDevices.length === 0 ? 'ef-device-help' : undefined}>
          <option value="">Select a device</option>
          {compatibleDevices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.deviceTypeCode === 'camera' ? `${d.make} ${d.model}` : d.name}
              {' '}({deviceTypeCodeToLabel(d.deviceTypeCode)})
            </option>
          ))}
        </select>
        {compatibleDevices.length === 0 ? (
          <p id="ef-device-help" className="field-help">No devices with matching film format. Add a device first.</p>
        ) : null}
      </div>
      {selectedDevice?.deviceTypeCode === 'film_holder' ? (
        <div className="form-field">
          <label htmlFor="ef-slot">Slot number</label>
          <select id="ef-slot" value={slotNumber} onChange={(e) => setSlotNumber(e.target.value)}>
            <option value="1">Slot 1</option>
            <option value="2">Slot 2</option>
          </select>
        </div>
      ) : null}
      <div className="form-field">
        <label htmlFor="ef-push-pull">Intended push/pull (optional)</label>
        <input id="ef-push-pull" type="number" value={intendedPushPull} onChange={(e) => setIntendedPushPull(e.target.value)} placeholder="0" aria-describedby="ef-push-pull-help" />
        <p id="ef-push-pull-help" className="field-help">Positive = push, negative = pull. Leave blank for none.</p>
      </div>
    </>
  );
}

function StoredSubForm({ refTables, onChange }: { refTables: ReferenceTables; onChange: (data: EventData) => void }) {
  const [locationId, setLocationId] = useState('');

  useEffect(() => {
    const loc = refTables.storageLocations.find((l) => String(l.id) === locationId);
    if (loc) onChange({ storageLocationId: loc.id, storageLocationCode: loc.code });
  }, [locationId, onChange, refTables.storageLocations]);

  return (
    <div className="form-field">
      <label htmlFor="ef-location">Storage location</label>
      <select id="ef-location" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
        <option value="">Select a location</option>
        {refTables.storageLocations.map((loc) => (
          <option key={loc.id} value={loc.id}>{loc.label}</option>
        ))}
      </select>
    </div>
  );
}

function LabSubForm({
  stateCode,
  onChange
}: {
  stateCode: 'sent_for_dev' | 'developed';
  onChange: (data: EventData) => void;
}) {
  const [labName, setLabName] = useState('');
  const [labContact, setLabContact] = useState('');
  const [actualPushPull, setActualPushPull] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costCurrency, setCostCurrency] = useState('USD');

  useEffect(() => {
    const push = actualPushPull ? Number(actualPushPull) : null;
    const data: EventData = {
      labName: labName.trim() || null,
      actualPushPull: push
    };
    if (stateCode === 'sent_for_dev') {
      data['labContact'] = labContact.trim() || null;
    }
    if (stateCode === 'sent_for_dev' && costAmount) {
      data['cost'] = { amount: Number(costAmount), currencyCode: costCurrency.toUpperCase() };
    }
    onChange(data);
  }, [actualPushPull, costAmount, costCurrency, labContact, labName, onChange, stateCode]);

  return (
    <>
      <ReferenceTypeaheadInput
        id="ef-lab-name"
        label="Lab name"
        kind="lab_name"
        value={labName}
        onChange={setLabName}
        required
      />
      {stateCode === 'sent_for_dev' ? (
        <ReferenceTypeaheadInput
          id="ef-lab-contact"
          label="Lab contact (optional)"
          kind="lab_contact"
          value={labContact}
          onChange={setLabContact}
        />
      ) : null}
      <div className="form-field">
        <label htmlFor="ef-actual-push-pull">Actual push/pull (optional)</label>
        <input id="ef-actual-push-pull" type="number" value={actualPushPull} onChange={(e) => setActualPushPull(e.target.value)} placeholder="0" />
      </div>
      {stateCode === 'sent_for_dev' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="ef-cost">Development cost (optional)</label>
            <input id="ef-cost" type="number" min="0" step="0.01" value={costAmount} onChange={(e) => setCostAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-field" style={{ marginBottom: 0, width: 90 }}>
            <label htmlFor="ef-currency">Currency</label>
            <input id="ef-currency" value={costCurrency} onChange={(e) => setCostCurrency(e.target.value)} placeholder="USD" maxLength={3} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function ScannedSubForm({ onChange }: { onChange: (data: EventData) => void }) {
  const [scannerOrSoftware, setScannerOrSoftware] = useState('');
  const [scanLink, setScanLink] = useState('');

  useEffect(() => {
    onChange({
      scannerOrSoftware: scannerOrSoftware.trim() || null,
      scanLink: scanLink.trim() || null
    });
  }, [onChange, scanLink, scannerOrSoftware]);

  return (
    <>
      <div className="form-field">
        <label htmlFor="ef-scanner">Scanner/software (optional)</label>
        <input
          id="ef-scanner"
          value={scannerOrSoftware}
          onChange={(e) => setScannerOrSoftware(e.target.value)}
          placeholder="Scanner or scan software"
        />
      </div>
      <div className="form-field">
        <label htmlFor="ef-scan-link">Scan link (optional)</label>
        <input
          id="ef-scan-link"
          value={scanLink}
          onChange={(e) => setScanLink(e.target.value)}
          placeholder="https://..."
        />
      </div>
    </>
  );
}

export function FilmEventForm({ filmId, filmFormatId, currentStateCode, availableStates, refTables, onEventAdded }: FilmEventFormProps) {
  const { api } = useSession();
  const [selectedCode, setSelectedCode] = useState('');
  const [occurredAt, setOccurredAt] = useState(todayLocalDate());
  const [notes, setNotes] = useState('');
  const [subFormData, setSubFormData] = useState<EventData>({});
  const [error, setError] = useState<string | null>(null);
  const {
    beginSubmit,
    endSubmit,
    idempotencyKeyRef: eventIdempotencyKeyRef,
    isSubmitting,
    resetIdempotencyKey: resetEventIdempotencyKey,
    resetSubmit
  } = useIdempotentSubmit();
  const {
    idempotencyKeyRef: labCreateIdempotencyKeyRef,
    resetIdempotencyKey: resetLabCreateIdempotencyKey
  } = useIdempotencyKey();

  const validNextCodes = filmTransitionMap.get(currentStateCode) ?? [];
  const validNextStates = availableStates.filter((s) => validNextCodes.includes(s.code));

  useEffect(() => {
    setSelectedCode('');
    setNotes('');
    setSubFormData({});
    setError(null);
    resetSubmit();
    resetLabCreateIdempotencyKey();
  }, [currentStateCode, filmId, resetLabCreateIdempotencyKey, resetSubmit]);

  async function resolveLabEventData(stateCode: string, data: EventData): Promise<EventData> {
    if (stateCode !== 'sent_for_dev' && stateCode !== 'developed') {
      return data;
    }
    if (typeof data['labId'] === 'number') {
      return data;
    }

    const labName = typeof data['labName'] === 'string' ? data['labName'].trim() : '';
    if (!labName) {
      return data;
    }

    const existingLabs = await api.getFilmLabs({ q: labName, includeInactive: false, limit: LIST_MAX_LIMIT });
    const existingLab = existingLabs.find((lab) => normalizeLookup(lab.name) === normalizeLookup(labName));
    if (existingLab) {
      return { ...data, labId: existingLab.id, labName: existingLab.name };
    }

    const labContact = typeof data['labContact'] === 'string' ? data['labContact'].trim() : '';
    try {
      const created = await api.createFilmLab(createFilmLabRequestSchema.parse({
        name: labName,
        contact: labContact || undefined
      }), labCreateIdempotencyKeyRef.current);
      return { ...data, labId: created.id, labName: created.name };
    } catch (err) {
      const refreshedLabs = await api.getFilmLabs({ q: labName, includeInactive: false, limit: LIST_MAX_LIMIT });
      const refreshedLab = refreshedLabs.find((lab) => normalizeLookup(lab.name) === normalizeLookup(labName));
      if (refreshedLab) {
        return { ...data, labId: refreshedLab.id, labName: refreshedLab.name };
      }
      throw err;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!beginSubmit()) return;
    setError(null);
    try {
      const resolvedSubFormData = await resolveLabEventData(selectedCode, subFormData);
      const eventData = selectedCode === 'scanned'
        ? { scannerOrSoftware: null, scanLink: null, ...resolvedSubFormData }
        : resolvedSubFormData;
      const eventPayload = filmJourneyEventPayloadSchema.parse({
        filmStateCode: selectedCode,
        eventData
      });
      const payload = createFilmJourneyEventRequestSchema.parse({
        filmStateCode: selectedCode,
        occurredAt: new Date(`${occurredAt}T12:00:00.000Z`).toISOString(),
        notes: notes || undefined,
        eventData: eventPayload.eventData
      });
      await api.createFilmJourneyEvent(filmId, payload, eventIdempotencyKeyRef.current);
      setSelectedCode('');
      setNotes('');
      setSubFormData({});
      resetEventIdempotencyKey();
      resetLabCreateIdempotencyKey();
      onEventAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add event');
    } finally {
      endSubmit();
    }
  }

  if (validNextStates.length === 0) {
    return <p className="field-help">No further transitions available for this film.</p>;
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <fieldset disabled={isSubmitting} style={{ margin: 0, padding: 0, border: 'none' }}>
      <legend className="sr-only">Add film event</legend>
      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      <div className="form-field">
        <label htmlFor="ef-next-state">Next state</label>
        <select id="ef-next-state" value={selectedCode} onChange={(e) => { setSelectedCode(e.target.value); setSubFormData({}); }} required>
          <option value="">Select transition</option>
          {validNextStates.map((s) => (
            <option key={s.id} value={s.code}>{s.label}</option>
          ))}
        </select>
      </div>

      {selectedCode ? (
        <>
          <div className="form-field">
            <label htmlFor="ef-occurred-at">Occurred at</label>
            <input id="ef-occurred-at" type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="ef-notes">Notes (optional)</label>
            <textarea id="ef-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {selectedCode === 'loaded' ? (
            <LoadedSubForm filmFormatId={filmFormatId} refTables={refTables} onChange={setSubFormData} />
          ) : selectedCode === 'stored' ? (
            <StoredSubForm refTables={refTables} onChange={setSubFormData} />
          ) : selectedCode === 'sent_for_dev' ? (
            <LabSubForm key="sent_for_dev" stateCode="sent_for_dev" onChange={setSubFormData} />
          ) : selectedCode === 'developed' ? (
            <LabSubForm key="developed" stateCode="developed" onChange={setSubFormData} />
          ) : selectedCode === 'scanned' ? (
            <ScannedSubForm key="scanned" onChange={setSubFormData} />
          ) : null}

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add event'}
            </button>
          </div>
        </>
      ) : null}
      </fieldset>
    </form>
  );
}
