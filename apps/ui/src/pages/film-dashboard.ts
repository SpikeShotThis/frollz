export const FILM_EXPIRING_SOON_DAYS = 90;

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

export function buildChildKpis(
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
