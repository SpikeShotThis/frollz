'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { APERTURE_PRESETS, updateFilmFrameRequestSchema } from '@frollz2/schema';
import type { FilmFrame } from '@frollz2/schema';
import { useSession } from '../auth/session';
import { parseShutterSpeedInput, formatShutterSpeed } from '../utils/shutterSpeed';

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const APERTURE_PRESET_VALUES: readonly number[] = APERTURE_PRESETS;
const APERTURE_OPTIONS = [
  ...APERTURE_PRESETS.map((v: number) => ({ label: `f/${v}`, value: String(v) })),
  { label: 'Other…', value: '__custom__' }
];

export function FrameEditor({
  frame,
  filmId,
  readonly
}: {
  frame: FilmFrame;
  filmId: number;
  readonly?: boolean;
}) {
  const { api } = useSession();
  const idPrefix = useId();
  const [aperturePreset, setAperturePreset] = useState<string>('');
  const [apertureCustom, setApertureCustom] = useState('');
  const [shutterInput, setShutterInput] = useState('');
  const [filterUsed, setFilterUsed] = useState<boolean | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);
  const saveLockRef = useRef(false);

  useEffect(() => {
    if (frame.aperture !== null) {
      const isPreset = APERTURE_PRESET_VALUES.includes(frame.aperture);
      if (isPreset) {
        setAperturePreset(String(frame.aperture));
      } else {
        setAperturePreset('__custom__');
        setApertureCustom(String(frame.aperture));
      }
    } else {
      setAperturePreset('');
    }
    if (frame.shutterSpeedSeconds !== null) {
      setShutterInput(formatShutterSpeed(frame.shutterSpeedSeconds));
    }
    setFilterUsed(frame.filterUsed);
    isInitialized.current = true;
  }, [frame.id]);

  const save = useCallback(async (aperture: number | null, shutter: number | null, filter: boolean | null) => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const payload = updateFilmFrameRequestSchema.parse({
        aperture,
        shutterSpeedSeconds: shutter,
        filterUsed: filter
      });
      await api.updateFilmFrame(filmId, frame.id, payload);
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      saveLockRef.current = false;
    }
  }, [api, filmId, frame.id]);

  function scheduleSave(aperture: number | null, shutter: number | null, filter: boolean | null) {
    if (!isInitialized.current) return;
    setSaveStatus('pending');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void save(aperture, shutter, filter);
    }, 800);
  }

  const resolvedAperture: number | null =
    aperturePreset === '__custom__'
      ? (parseFloat(apertureCustom) > 0 ? parseFloat(apertureCustom) : null)
      : aperturePreset
      ? Number(aperturePreset)
      : null;

  const shutterHint = shutterInput.trim()
    ? (parseShutterSpeedInput(shutterInput) !== null
        ? formatShutterSpeed(parseShutterSpeedInput(shutterInput)!)
        : 'Invalid format')
    : '';

  function handleAperturePresetChange(val: string) {
    setAperturePreset(val);
    const resolved = val === '__custom__' ? null : val ? Number(val) : null;
    const shutter = parseShutterSpeedInput(shutterInput);
    scheduleSave(resolved, shutter, filterUsed);
  }

  function handleApertureCustomChange(val: string) {
    setApertureCustom(val);
    const resolved = parseFloat(val) > 0 ? parseFloat(val) : null;
    const shutter = parseShutterSpeedInput(shutterInput);
    scheduleSave(resolved, shutter, filterUsed);
  }

  function handleShutterChange(val: string) {
    setShutterInput(val);
    const shutter = parseShutterSpeedInput(val);
    scheduleSave(resolvedAperture, shutter, filterUsed);
  }

  function cycleFilter() {
    const next = filterUsed === null ? true : filterUsed === true ? false : null;
    setFilterUsed(next);
    const shutter = parseShutterSpeedInput(shutterInput);
    scheduleSave(resolvedAperture, shutter, next);
  }

  const filterLabel = filterUsed === true ? 'Yes' : filterUsed === false ? 'No' : 'Unknown';
  const apertureId = `${idPrefix}-aperture`;
  const apertureCustomId = `${idPrefix}-aperture-custom`;
  const shutterId = `${idPrefix}-shutter`;
  const shutterHelpId = `${idPrefix}-shutter-help`;

  return (
    <div className="frame-editor">
      <div className="frame-editor-grid">
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label htmlFor={apertureId}>Aperture</label>
          <select id={apertureId} value={aperturePreset} onChange={(e) => handleAperturePresetChange(e.target.value)} disabled={readonly}>
            <option value="">Not recorded</option>
            {APERTURE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {aperturePreset === '__custom__' ? (
            <input
              id={apertureCustomId}
              type="number"
              value={apertureCustom}
              onChange={(e) => handleApertureCustomChange(e.target.value)}
              placeholder="e.g. 3.5"
              aria-label="Custom aperture"
              disabled={readonly}
              style={{ marginTop: 6 }}
            />
          ) : null}
        </div>

        <div className="form-field" style={{ marginBottom: 0 }}>
          <label htmlFor={shutterId}>Shutter speed</label>
          <input
            id={shutterId}
            value={shutterInput}
            onChange={(e) => handleShutterChange(e.target.value)}
            placeholder="e.g. 1/500 or 2.5"
            aria-describedby={shutterHint ? shutterHelpId : undefined}
            disabled={readonly}
          />
          {shutterHint ? <p id={shutterHelpId} className="field-help">{shutterHint}</p> : null}
        </div>

        <div className="form-field" style={{ marginBottom: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-ink)' }}>Filter used</span>
          <button
            type="button"
            className="secondary"
            onClick={cycleFilter}
            disabled={readonly}
            aria-label={`Filter used: ${filterLabel}. Activate to cycle value.`}
            style={{ textAlign: 'left', padding: '10px 12px' }}
          >
            {filterLabel}
            {!readonly ? <span style={{ marginLeft: 8, opacity: 0.5, fontSize: 11 }}>click to cycle</span> : null}
          </button>
        </div>
      </div>

      {saveStatus !== 'idle' ? (
        <p className={`save-indicator ${saveStatus}`} role={saveStatus === 'error' ? 'alert' : 'status'} aria-live="polite">
          {saveStatus === 'pending' && 'Waiting to save…'}
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved' && '✓ Saved'}
          {saveStatus === 'error' && `Error: ${saveError}`}
        </p>
      ) : null}
    </div>
  );
}
