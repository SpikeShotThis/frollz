'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '@frollz2/i18n';
import { APERTURE_PRESETS, updateFilmFrameRequestSchema } from '@frollz2/schema';
import type { FilmFrame } from '@frollz2/schema';
import { useSession } from '../auth/session';
import { parseShutterSpeedInput, formatShutterSpeed } from '../utils/shutterSpeed';
import { resolveApiError } from '../utils/resolve-api-error';

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const APERTURE_PRESET_VALUES: readonly number[] = APERTURE_PRESETS;
const APERTURE_PRESET_OPTIONS = APERTURE_PRESETS.map((v: number) => ({ label: `f/${v}`, value: String(v) }));

export function FrameEditor({
  frame,
  filmId,
  readonly
}: {
  frame: FilmFrame;
  filmId: number;
  readonly?: boolean;
}) {
  const { t } = useTranslation();
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
      setSaveError(resolveApiError(err, t, t('frameEditor.saveFailed')));
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
        : t('frameEditor.invalidFormat'))
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

  const filterLabel = filterUsed === true ? t('frameEditor.filterYes') : filterUsed === false ? t('frameEditor.filterNo') : t('frameEditor.filterUnknown');
  const apertureId = `${idPrefix}-aperture`;
  const apertureCustomId = `${idPrefix}-aperture-custom`;
  const shutterId = `${idPrefix}-shutter`;
  const shutterHelpId = `${idPrefix}-shutter-help`;

  const apertureOptions = [
    ...APERTURE_PRESET_OPTIONS,
    { label: t('frameEditor.otherAperture'), value: '__custom__' }
  ];

  return (
    <div className="frame-editor">
      <div className="frame-editor-grid">
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label htmlFor={apertureId}>{t('frameEditor.aperture')}</label>
          <select id={apertureId} value={aperturePreset} onChange={(e) => handleAperturePresetChange(e.target.value)} disabled={readonly}>
            <option value="">{t('frameEditor.notRecorded')}</option>
            {apertureOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {aperturePreset === '__custom__' ? (
            <input
              id={apertureCustomId}
              type="number"
              value={apertureCustom}
              onChange={(e) => handleApertureCustomChange(e.target.value)}
              placeholder={t('frameEditor.customAperturePlaceholder')}
              aria-label={t('frameEditor.customAperture')}
              disabled={readonly}
              style={{ marginTop: 6 }}
            />
          ) : null}
        </div>

        <div className="form-field" style={{ marginBottom: 0 }}>
          <label htmlFor={shutterId}>{t('frameEditor.shutterSpeed')}</label>
          <input
            id={shutterId}
            value={shutterInput}
            onChange={(e) => handleShutterChange(e.target.value)}
            placeholder={t('frameEditor.shutterSpeedPlaceholder')}
            aria-describedby={shutterHint ? shutterHelpId : undefined}
            disabled={readonly}
          />
          {shutterHint ? <p id={shutterHelpId} className="field-help">{shutterHint}</p> : null}
        </div>

        <div className="form-field" style={{ marginBottom: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-ink)' }}>{t('frameEditor.filterUsed')}</span>
          <button
            type="button"
            className="secondary"
            onClick={cycleFilter}
            disabled={readonly}
            aria-label={t('frameEditor.filterAriaLabel', { value: filterLabel })}
            style={{ textAlign: 'left', padding: '10px 12px' }}
          >
            {filterLabel}
            {!readonly ? <span style={{ marginLeft: 8, opacity: 0.5, fontSize: 11 }}>{t('frameEditor.clickToCycle')}</span> : null}
          </button>
        </div>
      </div>

      {saveStatus !== 'idle' ? (
        <p className={`save-indicator ${saveStatus}`} role={saveStatus === 'error' ? 'alert' : 'status'} aria-live="polite">
          {saveStatus === 'pending' && t('frameEditor.waitingToSave')}
          {saveStatus === 'saving' && t('frameEditor.saving')}
          {saveStatus === 'saved' && t('frameEditor.saved')}
          {saveStatus === 'error' && t('frameEditor.saveError', { message: saveError })}
        </p>
      ) : null}
    </div>
  );
}
