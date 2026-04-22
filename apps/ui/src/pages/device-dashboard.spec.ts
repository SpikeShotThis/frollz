import { describe, expect, it } from 'vitest';
import type { FilmDevice } from '@frollz2/schema';
import {
  buildDeviceKpis,
  devicePrimaryLabel,
  filterAndSortDevicesForChildTable,
  filterDevicesByTypeCode
} from './device-dashboard.js';

function makeCamera(id: number, make: string, model: string): FilmDevice {
  return {
    id,
    userId: 1,
    deviceTypeId: 1,
    deviceTypeCode: 'camera',
    filmFormatId: 1,
    frameSize: '36x24',
    make,
    model,
    serialNumber: null,
    dateAcquired: null
  };
}

function makeHolder(id: number, name: string, brand: string): FilmDevice {
  return {
    id,
    userId: 1,
    deviceTypeId: 3,
    deviceTypeCode: 'film_holder',
    filmFormatId: 3,
    frameSize: '4x5',
    name,
    brand,
    holderTypeId: 1,
    holderTypeCode: 'standard',
    slots: []
  };
}

describe('device-dashboard helpers', () => {
  it('filters devices by type code when present', () => {
    const devices: FilmDevice[] = [makeCamera(1, 'Nikon', 'F3'), makeHolder(2, 'Fidelity Elite', 'Fidelity')];

    expect(filterDevicesByTypeCode(devices, 'camera').map((entry) => entry.id)).toEqual([1]);
    expect(filterDevicesByTypeCode(devices, null).map((entry) => entry.id)).toEqual([1, 2]);
  });

  it('filters by search term and sorts by primary label', () => {
    const devices: FilmDevice[] = [makeCamera(1, 'Nikon', 'F3'), makeCamera(2, 'Canon', 'AE-1'), makeHolder(3, 'Graflex', 'Graflex')];

    const filtered = filterAndSortDevicesForChildTable(devices, 'cam');
    expect(filtered.map((entry) => entry.id)).toEqual([2, 1]);

    const holderOnly = filterAndSortDevicesForChildTable(devices, 'graf');
    expect(holderOnly.map((entry) => entry.id)).toEqual([3]);
  });

  it('builds KPI cards for visible device slice', () => {
    const devices: FilmDevice[] = [makeCamera(1, 'Nikon', 'F3'), makeCamera(2, 'Canon', 'AE-1'), makeHolder(3, 'Fidelity', 'Fidelity')];

    expect(buildDeviceKpis(devices)).toEqual([
      { label: 'Total visible devices', value: 3, helper: 'Current route scope' },
      { label: 'Cameras', value: 2, helper: 'Body-level capture devices' },
      { label: 'Interchangeable backs', value: 0, helper: 'Modular backs and magazines' },
      { label: 'Film holders', value: 1, helper: 'Sheet and holder systems' }
    ]);
  });

  it('formats primary labels by device type', () => {
    expect(devicePrimaryLabel(makeCamera(1, 'Nikon', 'F3'))).toBe('Nikon F3');
    expect(devicePrimaryLabel(makeHolder(2, 'Fidelity', 'Fidelity'))).toBe('Fidelity Fidelity');
  });
});
