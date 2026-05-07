import { describe, expect, it } from 'vitest';

function makeT(translations: Record<string, string>) {
  return (key: string, opts?: Record<string, string | number>) => {
    let str = translations[key] ?? key;
    if (opts) {
      for (const [k, v] of Object.entries(opts)) {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return str;
  };
}

const t = makeT({
  'dashboard.kpi.total.title': 'Total Films',
  'dashboard.kpi.total.helper': 'All tracked rolls and sheets',
  'dashboard.kpi.total.actionLabel': 'Open film',
  'dashboard.kpi.total.segments.loaded': 'Loaded',
  'dashboard.kpi.total.segments.removed': 'Removed',
  'dashboard.kpi.total.segments.atLab': 'At Lab',
  'dashboard.kpi.total.segments.archived': 'Archived',
  'dashboard.kpi.format.title': 'By Format',
  'dashboard.kpi.format.helper': '35mm {{count35mm}} · 120 {{count120}} · Sheet {{countSheet}}',
  'dashboard.kpi.format.actionLabel': 'Open formats',
  'dashboard.kpi.format.segments.mm35': '35mm',
  'dashboard.kpi.format.segments.mm120': '120',
  'dashboard.kpi.format.segments.sheet': 'Sheet',
  'dashboard.kpi.loaded.title': 'Loaded (Idle Risk)',
  'dashboard.kpi.loaded.helper': '{{loadedIdleCount}} idle > {{loadedIdleDays}} days',
  'dashboard.kpi.loaded.actionLabel': 'View loaded',
  'dashboard.kpi.loaded.segments.idle': 'Idle > {{days}}d',
  'dashboard.kpi.loaded.segments.active': 'Active ≤ {{days}}d',
  'dashboard.kpi.removed.title': 'Removed (Not Sent)',
  'dashboard.kpi.removed.helper': 'Oldest waiting: {{days}} days',
  'dashboard.kpi.removed.actionLabel': 'View removed',
  'dashboard.kpi.removed.segments.awaitingLab': 'Awaiting lab',
  'dashboard.kpi.removed.segments.otherStates': 'Other states',
  'dashboard.kpi.sentForDev.title': 'Sent for Dev',
  'dashboard.kpi.sentForDev.helper': 'Oldest at lab: {{days}} days',
  'dashboard.kpi.sentForDev.actionLabel': 'View lab queue',
  'dashboard.kpi.sentForDev.segments.inLabQueue': 'In lab queue',
  'dashboard.kpi.sentForDev.segments.notInLab': 'Not in lab',
  'dashboard.kpi.expiring.title': 'Expiring Soon',
  'dashboard.kpi.expiring.helper': 'Expires in next {{days}} days',
  'dashboard.kpi.expiring.actionLabel': 'Review stock',
  'dashboard.kpi.expiring.segments.expiringSoon': 'Expires ≤ {{days}}d',
  'dashboard.kpi.expiring.segments.stableHorizon': 'Stable horizon',
  'dashboard.kpi.archived.title': 'Archived',
  'dashboard.kpi.archived.helper': 'Completed rolls and sheets',
  'dashboard.kpi.archived.actionLabel': 'View archived',
  'dashboard.kpi.archived.segments.completed': 'Completed',
  'dashboard.kpi.archived.segments.stillActive': 'Still active',
  'dashboard.kpi.recent.title': 'Recent Activity ({{days}}d)',
  'dashboard.kpi.recent.helper': 'Films with new state changes',
  'dashboard.kpi.recent.actionLabel': 'Open film',
  'dashboard.kpi.recent.segments.changed': 'Changed ≤ {{days}}d',
  'dashboard.kpi.recent.segments.noRecentChange': 'No recent change'
});
import {
  FILM_EXPIRING_SOON_DAYS,
  buildFilmDashboardOverview,
  buildFilmKpis,
  countExpiringSoonFilms,
  filterAndSortFilmsForChildTable,
  filterFilmsByFormatCodes,
  paginateFilms,
  type FilmListItem
} from './film-dashboard.js';

function makeFilm(input: Partial<FilmListItem> & Pick<FilmListItem, 'id' | 'name'>): FilmListItem {
  return {
    id: input.id,
    name: input.name,
    expirationDate: input.expirationDate ?? null,
    currentStateCode: input.currentStateCode ?? 'stored',
    currentState: input.currentState ?? { label: 'Stored' },
    emulsion: input.emulsion ?? {
      manufacturer: 'Kodak',
      brand: 'Gold',
      isoSpeed: 200
    },
    filmFormat: input.filmFormat ?? { code: '35mm' }
  };
}

describe('film-dashboard helpers', () => {
  it('filters by route film format codes', () => {
    const films = [
      makeFilm({ id: 1, name: 'A', filmFormat: { code: '35mm' } }),
      makeFilm({ id: 2, name: 'B', filmFormat: { code: '120' } }),
      makeFilm({ id: 3, name: 'C', filmFormat: { code: '4x5' } })
    ];

    expect(filterFilmsByFormatCodes(films, ['35mm', '120']).map((film) => film.id)).toEqual([1, 2]);
  });

  it('applies state + text filter and defaults to name A-Z sort', () => {
    const films = [
      makeFilm({ id: 1, name: 'zeta', currentStateCode: 'loaded', currentState: { label: 'Loaded' } }),
      makeFilm({
        id: 2,
        name: 'Alpha',
        currentStateCode: 'loaded',
        currentState: { label: 'Loaded' },
        emulsion: { manufacturer: 'Ilford', brand: 'HP5', isoSpeed: 400 }
      }),
      makeFilm({ id: 3, name: 'Beta', currentStateCode: 'exposed', currentState: { label: 'Exposed' } })
    ];

    const result = filterAndSortFilmsForChildTable(films, 'loaded', 'ilf');
    expect(result.map((film) => film.id)).toEqual([2]);

    const sorted = filterAndSortFilmsForChildTable(films, null, '');
    expect(sorted.map((film) => film.name)).toEqual(['Alpha', 'Beta', 'zeta']);
  });

  it('paginates client-side with page and size controls', () => {
    const films = Array.from({ length: 26 }, (_, index) => makeFilm({ id: index + 1, name: `Film ${index + 1}` }));

    expect(paginateFilms(films, 1, 10).length).toBe(10);
    expect(paginateFilms(films, 2, 10).at(0)?.id).toBe(11);
    expect(paginateFilms(films, 3, 10).length).toBe(6);
  });

  it('counts expiring-soon correctly and ignores null expiration', () => {
    const now = Date.parse('2026-04-22T00:00:00.000Z');
    const films = [
      makeFilm({ id: 1, name: 'Soon', expirationDate: '2026-06-01T00:00:00.000Z' }),
      makeFilm({ id: 2, name: 'Later', expirationDate: '2026-10-01T00:00:00.000Z' }),
      makeFilm({ id: 3, name: 'None', expirationDate: null })
    ];

    expect(countExpiringSoonFilms(films, now, FILM_EXPIRING_SOON_DAYS)).toBe(1);
  });

  it('builds KPI cards with sent for development, expiring soon, total, and exposed', () => {
    const now = Date.parse('2026-04-22T00:00:00.000Z');
    const films = [
      makeFilm({
        id: 1,
        name: 'Sent',
        currentStateCode: 'sent_for_dev',
        currentState: { label: 'Sent for development' },
        expirationDate: '2026-05-01T00:00:00.000Z'
      }),
      makeFilm({ id: 2, name: 'Exposed', currentStateCode: 'exposed', currentState: { label: 'Exposed' }, expirationDate: null }),
      makeFilm({ id: 3, name: 'Stored', currentStateCode: 'stored', currentState: { label: 'Stored' }, expirationDate: '2027-01-01T00:00:00.000Z' })
    ];

    expect(buildFilmKpis(films, now, 90)).toEqual([
      { label: 'Sent for development', value: 1, helper: 'Current lab pipeline' },
      { label: 'Expiring soon', value: 1, helper: 'Expires in next 90 days' },
      { label: 'Total', value: 3, helper: 'All films in this format route' },
      { label: 'Exposed', value: 1, helper: 'Awaiting removal or development' }
    ]);
  });

  it('builds the full film workflow dashboard overview', () => {
    const now = Date.parse('2026-04-22T00:00:00.000Z');
    const films = [
      makeFilm({ id: 1, name: 'Loaded idle', currentStateCode: 'loaded', currentState: { label: 'Loaded' }, filmFormat: { code: '35mm' } }),
      makeFilm({ id: 2, name: 'Loaded fresh', currentStateCode: 'loaded', currentState: { label: 'Loaded' }, filmFormat: { code: '120' } }),
      makeFilm({ id: 3, name: 'Removed', currentStateCode: 'removed', currentState: { label: 'Removed' }, filmFormat: { code: '4x5' } }),
      makeFilm({ id: 4, name: 'Lab', currentStateCode: 'sent_for_dev', currentState: { label: 'Sent for development' }, filmFormat: { code: '35mm' } }),
      makeFilm({ id: 5, name: 'Archived', currentStateCode: 'archived', currentState: { label: 'Archived' }, expirationDate: '2026-05-10T00:00:00.000Z', filmFormat: { code: '120' } })
    ];

    const cards = buildFilmDashboardOverview(
      films,
      {
        1: { occurredAt: '2026-04-01T00:00:00.000Z' },
        2: { occurredAt: '2026-04-20T00:00:00.000Z' },
        3: { occurredAt: '2026-04-12T00:00:00.000Z' },
        4: { occurredAt: '2026-04-02T00:00:00.000Z' },
        5: { occurredAt: '2026-04-21T00:00:00.000Z' }
      },
      now,
      { t }
    );

    expect(cards.map((card) => [card.key, card.value, card.helper])).toEqual([
      ['total', 5, 'All tracked rolls and sheets'],
      ['format', 5, '35mm 2 · 120 2 · Sheet 1'],
      ['loaded', 2, '1 idle > 14 days'],
      ['removed', 1, 'Oldest waiting: 10 days'],
      ['sent-for-dev', 1, 'Oldest at lab: 20 days'],
      ['expiring', 1, 'Expires in next 90 days'],
      ['archived', 1, 'Completed rolls and sheets'],
      ['recent', 2, 'Films with new state changes']
    ]);
    expect(cards.find((card) => card.key === 'loaded')?.segments.map((segment) => [segment.key, segment.value])).toEqual([
      ['loaded-idle', 1],
      ['loaded-active', 1]
    ]);
  });
});
