export const FILM_EXPIRING_SOON_DAYS = 90;
export const FILM_LOADED_IDLE_DAYS = 14;
export const FILM_RECENT_ACTIVITY_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LARGE_FORMAT_CODES = ['4x5', '5x7', '8x10', '11x14'] as const;

export type FilmListItem = {
  id: number;
  name: string;
  expirationDate: string | null;
  currentStateCode: string;
  currentState: { label: string };
  emulsion: {
    manufacturer: string;
    brand: string;
    isoSpeed: number;
  };
  filmFormat: {
    code: string;
  };
};

export type FilmDashboardCard = {
  label: string;
  value: number;
  helper: string;
};

export type FilmLatestEvent = {
  occurredAt: string;
} | null;

export type FilmDashboardSegment = {
  key: string;
  label: string;
  value: number;
  ratio: number;
};

export type FilmDashboardOverviewCard = {
  key: string;
  title: string;
  value: number;
  helper: string;
  actionHref: string;
  actionLabel: string;
  segments: FilmDashboardSegment[];
};

export function filterFilmsByFormatCodes<T extends FilmListItem>(films: T[], formatCodes: string[]): T[] {
  if (formatCodes.length === 0) {
    return films;
  }

  return films.filter((film) => formatCodes.includes(film.filmFormat.code));
}

export function filterAndSortFilmsForChildTable<T extends FilmListItem>(
  films: T[],
  stateFilter: string | null,
  searchTerm: string
): T[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filtered = films.filter((film) => {
    if (stateFilter && film.currentStateCode !== stateFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchable = [film.name, film.emulsion.manufacturer, film.emulsion.brand, String(film.emulsion.isoSpeed)]
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });

  return filtered.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function paginateFilms<T extends FilmListItem>(films: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;
  return films.slice(start, start + safePageSize);
}

export function countExpiringSoonFilms(films: FilmListItem[], now: number, days = FILM_EXPIRING_SOON_DAYS): number {
  const soonThreshold = now + days * 24 * 60 * 60 * 1000;

  return films.filter((film) => {
    if (!film.expirationDate) {
      return false;
    }

    const expiration = Date.parse(film.expirationDate);
    if (Number.isNaN(expiration)) {
      return false;
    }

    return expiration >= now && expiration <= soonThreshold;
  }).length;
}

function eventAgeInDays(event: FilmLatestEvent, now: number): number | null {
  if (!event) return null;
  const occurredAt = Date.parse(event.occurredAt);
  if (Number.isNaN(occurredAt)) return null;
  return Math.floor((now - occurredAt) / MS_PER_DAY);
}

function eventIsWithinDays(event: FilmLatestEvent, now: number, days: number): boolean {
  if (!event) return false;
  const occurredAt = Date.parse(event.occurredAt);
  if (Number.isNaN(occurredAt)) return false;
  return occurredAt >= now - days * MS_PER_DAY;
}

function byState<T extends FilmListItem>(films: T[], stateCode: string): T[] {
  return films.filter((film) => film.currentStateCode === stateCode);
}

function countByFormats(films: FilmListItem[], formatCodes: readonly string[]): number {
  return films.filter((film) => formatCodes.includes(film.filmFormat.code)).length;
}

function ratio(value: number, total: number): number {
  return total <= 0 ? 0 : value / total;
}

export function buildFilmDashboardOverview(
  films: FilmListItem[],
  latestEventsByFilmId: Record<number, FilmLatestEvent>,
  now: number,
  options: {
    expiringSoonDays?: number;
    loadedIdleDays?: number;
    recentActivityDays?: number;
  } = {}
): FilmDashboardOverviewCard[] {
  const expiringSoonDays = options.expiringSoonDays ?? FILM_EXPIRING_SOON_DAYS;
  const loadedIdleDays = options.loadedIdleDays ?? FILM_LOADED_IDLE_DAYS;
  const recentActivityDays = options.recentActivityDays ?? FILM_RECENT_ACTIVITY_DAYS;
  const totalFilms = films.length;
  const safeTotal = Math.max(1, totalFilms);
  const count35mm = countByFormats(films, ['35mm']);
  const count120 = countByFormats(films, ['120']);
  const countSheet = countByFormats(films, LARGE_FORMAT_CODES);
  const loadedFilms = byState(films, 'loaded');
  const removedFilms = byState(films, 'removed');
  const sentForDevFilms = byState(films, 'sent_for_dev');
  const archivedFilms = byState(films, 'archived');
  const expiringSoonCount = countExpiringSoonFilms(films, now, expiringSoonDays);
  const loadedIdleCount = loadedFilms.filter((film) => {
    const age = eventAgeInDays(latestEventsByFilmId[film.id] ?? null, now);
    return age !== null && age > loadedIdleDays;
  }).length;
  const removedOldestDays = Math.max(
    0,
    ...removedFilms
      .map((film) => eventAgeInDays(latestEventsByFilmId[film.id] ?? null, now))
      .filter((value): value is number => value !== null)
  );
  const sentForDevOldestDays = Math.max(
    0,
    ...sentForDevFilms
      .map((film) => eventAgeInDays(latestEventsByFilmId[film.id] ?? null, now))
      .filter((value): value is number => value !== null)
  );
  const recentActivityCount = films.filter((film) =>
    eventIsWithinDays(latestEventsByFilmId[film.id] ?? null, now, recentActivityDays)
  ).length;

  return [
    {
      key: 'total',
      title: 'Total Films',
      value: totalFilms,
      helper: 'All tracked rolls and sheets',
      actionHref: '/film',
      actionLabel: 'Open film',
      segments: [
        { key: 'loaded', label: 'Loaded', value: loadedFilms.length, ratio: ratio(loadedFilms.length, safeTotal) },
        { key: 'removed', label: 'Removed', value: removedFilms.length, ratio: ratio(removedFilms.length, safeTotal) },
        { key: 'at-lab', label: 'At Lab', value: sentForDevFilms.length, ratio: ratio(sentForDevFilms.length, safeTotal) },
        { key: 'archived', label: 'Archived', value: archivedFilms.length, ratio: ratio(archivedFilms.length, safeTotal) }
      ]
    },
    {
      key: 'format',
      title: 'By Format',
      value: totalFilms,
      helper: `35mm ${count35mm} · 120 ${count120} · Sheet ${countSheet}`,
      actionHref: '/film',
      actionLabel: 'Open formats',
      segments: [
        { key: '35mm', label: '35mm', value: count35mm, ratio: ratio(count35mm, safeTotal) },
        { key: '120', label: '120', value: count120, ratio: ratio(count120, safeTotal) },
        { key: 'sheet', label: 'Sheet', value: countSheet, ratio: ratio(countSheet, safeTotal) }
      ]
    },
    {
      key: 'loaded',
      title: 'Loaded (Idle Risk)',
      value: loadedFilms.length,
      helper: `${loadedIdleCount} idle > ${loadedIdleDays} days`,
      actionHref: '/film?stateCode=loaded',
      actionLabel: 'View loaded',
      segments: [
        { key: 'loaded-idle', label: `Idle > ${loadedIdleDays}d`, value: loadedIdleCount, ratio: ratio(loadedIdleCount, loadedFilms.length) },
        {
          key: 'loaded-active',
          label: `Active <= ${loadedIdleDays}d`,
          value: Math.max(0, loadedFilms.length - loadedIdleCount),
          ratio: ratio(Math.max(0, loadedFilms.length - loadedIdleCount), loadedFilms.length)
        }
      ]
    },
    {
      key: 'removed',
      title: 'Removed (Not Sent)',
      value: removedFilms.length,
      helper: `Oldest waiting: ${removedOldestDays} days`,
      actionHref: '/film?stateCode=removed',
      actionLabel: 'View removed',
      segments: [
        { key: 'removed-total', label: 'Awaiting lab', value: removedFilms.length, ratio: ratio(removedFilms.length, safeTotal) },
        { key: 'removed-other', label: 'Other states', value: Math.max(0, totalFilms - removedFilms.length), ratio: ratio(Math.max(0, totalFilms - removedFilms.length), safeTotal) }
      ]
    },
    {
      key: 'sent-for-dev',
      title: 'Sent for Dev',
      value: sentForDevFilms.length,
      helper: `Oldest at lab: ${sentForDevOldestDays} days`,
      actionHref: '/film?stateCode=sent_for_dev',
      actionLabel: 'View lab queue',
      segments: [
        { key: 'dev-at-lab', label: 'In lab queue', value: sentForDevFilms.length, ratio: ratio(sentForDevFilms.length, safeTotal) },
        { key: 'dev-not-lab', label: 'Not in lab', value: Math.max(0, totalFilms - sentForDevFilms.length), ratio: ratio(Math.max(0, totalFilms - sentForDevFilms.length), safeTotal) }
      ]
    },
    {
      key: 'expiring',
      title: 'Expiring Soon',
      value: expiringSoonCount,
      helper: `Expires in next ${expiringSoonDays} days`,
      actionHref: '/film',
      actionLabel: 'Review stock',
      segments: [
        { key: 'expiring-soon', label: `Expires <= ${expiringSoonDays}d`, value: expiringSoonCount, ratio: ratio(expiringSoonCount, safeTotal) },
        { key: 'expiring-later', label: 'Stable horizon', value: Math.max(0, totalFilms - expiringSoonCount), ratio: ratio(Math.max(0, totalFilms - expiringSoonCount), safeTotal) }
      ]
    },
    {
      key: 'archived',
      title: 'Archived',
      value: archivedFilms.length,
      helper: 'Completed rolls and sheets',
      actionHref: '/film?stateCode=archived',
      actionLabel: 'View archived',
      segments: [
        { key: 'archived-done', label: 'Completed', value: archivedFilms.length, ratio: ratio(archivedFilms.length, safeTotal) },
        { key: 'archived-open', label: 'Still active', value: Math.max(0, totalFilms - archivedFilms.length), ratio: ratio(Math.max(0, totalFilms - archivedFilms.length), safeTotal) }
      ]
    },
    {
      key: 'recent',
      title: `Recent Activity (${recentActivityDays}d)`,
      value: recentActivityCount,
      helper: 'Films with new state changes',
      actionHref: '/film',
      actionLabel: 'Open film',
      segments: [
        { key: 'recent-active', label: `Changed <= ${recentActivityDays}d`, value: recentActivityCount, ratio: ratio(recentActivityCount, safeTotal) },
        { key: 'recent-quiet', label: 'No recent change', value: Math.max(0, totalFilms - recentActivityCount), ratio: ratio(Math.max(0, totalFilms - recentActivityCount), safeTotal) }
      ]
    }
  ];
}

export function buildFilmKpis(
  films: FilmListItem[],
  now: number,
  days = FILM_EXPIRING_SOON_DAYS
): FilmDashboardCard[] {
  return [
    {
      label: 'Sent for development',
      value: films.filter((film) => film.currentStateCode === 'sent_for_dev').length,
      helper: 'Current lab pipeline'
    },
    {
      label: 'Expiring soon',
      value: countExpiringSoonFilms(films, now, days),
      helper: `Expires in next ${days} days`
    },
    {
      label: 'Total',
      value: films.length,
      helper: 'All films in this format route'
    },
    {
      label: 'Exposed',
      value: films.filter((film) => film.currentStateCode === 'exposed').length,
      helper: 'Awaiting removal or development'
    }
  ];
}
