import type { FilmDevice } from '@frollz2/schema';

export type DeviceDashboardCard = {
  label: string;
  value: number;
  helper: string;
};

export function filterDevicesByTypeCode(devices: FilmDevice[], typeCode: string | null): FilmDevice[] {
  if (!typeCode) {
    return devices;
  }

  return devices.filter((device) => device.deviceTypeCode === typeCode);
}

export function filterAndSortDevicesForChildTable(devices: FilmDevice[], searchTerm: string): FilmDevice[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filtered = devices.filter((device) => {
    if (!normalizedSearch) {
      return true;
    }

    const searchable = [
      device.deviceTypeCode,
      device.frameSize,
      getDeviceSearchLabel(device)
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });

  return filtered.sort((a, b) => devicePrimaryLabel(a).localeCompare(devicePrimaryLabel(b), undefined, { sensitivity: 'base' }));
}

export function buildDeviceKpis(devices: FilmDevice[]): DeviceDashboardCard[] {
  return [
    { label: 'Total visible devices', value: devices.length, helper: 'Current route scope' },
    {
      label: 'Cameras',
      value: devices.filter((device) => device.deviceTypeCode === 'camera').length,
      helper: 'Body-level capture devices'
    },
    {
      label: 'Interchangeable backs',
      value: devices.filter((device) => device.deviceTypeCode === 'interchangeable_back').length,
      helper: 'Modular backs and magazines'
    },
    {
      label: 'Film holders',
      value: devices.filter((device) => device.deviceTypeCode === 'film_holder').length,
      helper: 'Sheet and holder systems'
    }
  ];
}

export function devicePrimaryLabel(device: FilmDevice): string {
  if (device.deviceTypeCode === 'camera') {
    return `${device.make} ${device.model}`;
  }

  if (device.deviceTypeCode === 'interchangeable_back') {
    return `${device.name} ${device.system}`;
  }

  return `${device.name} ${device.brand}`;
}

function getDeviceSearchLabel(device: FilmDevice): string {
  if (device.deviceTypeCode === 'camera') {
    return `${device.make} ${device.model} ${device.serialNumber ?? ''}`;
  }

  if (device.deviceTypeCode === 'interchangeable_back') {
    return `${device.name} ${device.system}`;
  }

  if (device.deviceTypeCode === 'film_holder') {
    return `${device.name} ${device.brand} ${device.holderTypeCode}`;
  }

  return '';
}
