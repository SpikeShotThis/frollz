import type { Emulsion } from '@frollz2/schema';

export type EmulsionDashboardCard = {
  label: string;
  value: number;
  helper: string;
};

export function filterEmulsionsByProcessCode(emulsions: Emulsion[], processCode: string | null): Emulsion[] {
  if (!processCode) {
    return emulsions;
  }

  return emulsions.filter((emulsion) => emulsion.developmentProcess.code === processCode);
}

export function filterAndSortEmulsionsForChildTable(emulsions: Emulsion[], searchTerm: string): Emulsion[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filtered = emulsions.filter((emulsion) => {
    if (!normalizedSearch) {
      return true;
    }

    const searchable = [
      emulsion.manufacturer,
      emulsion.brand,
      emulsion.developmentProcess.code,
      emulsion.developmentProcess.label,
      String(emulsion.isoSpeed),
      emulsion.balance,
      ...emulsion.filmFormats.map((format) => format.code)
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });

  return filtered.sort((a, b) => {
    const aLabel = `${a.manufacturer} ${a.brand}`;
    const bLabel = `${b.manufacturer} ${b.brand}`;
    return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
  });
}

export function buildEmulsionKpis(emulsions: Emulsion[]): EmulsionDashboardCard[] {
  const total = emulsions.length;
  const uniqueManufacturers = new Set(emulsions.map((emulsion) => emulsion.manufacturer)).size;
  const averageIso = total === 0 ? 0 : Math.round(emulsions.reduce((sum, emulsion) => sum + emulsion.isoSpeed, 0) / total);
  const uniqueFormats = new Set(emulsions.flatMap((emulsion) => emulsion.filmFormats.map((format) => format.code))).size;

  return [
    { label: 'Total visible emulsions', value: total, helper: 'Current route scope' },
    { label: 'Unique manufacturers', value: uniqueManufacturers, helper: 'Distinct brands in view' },
    { label: 'Average ISO', value: averageIso, helper: 'Rounded to nearest whole ISO' },
    { label: 'Format coverage', value: uniqueFormats, helper: 'Unique compatible film formats' }
  ];
}
