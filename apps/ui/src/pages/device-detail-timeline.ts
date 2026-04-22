import type { DeviceLoadTimelineEvent } from '@frollz2/schema';

type TimelineTone = {
  textColor: string;
  dotColor: string;
};

type DevelopmentProcessCode = DeviceLoadTimelineEvent['developmentProcessCode'];

const toneByDevelopmentProcess: Record<DevelopmentProcessCode, TimelineTone> = {
  C41: {
    textColor: '#5ad89a',
    dotColor: '#18a058'
  },
  E6: {
    textColor: '#7ec3ff',
    dotColor: '#2080f0'
  },
  ECN2: {
    textColor: '#ffd68a',
    dotColor: '#f0a020'
  },
  BW: {
    textColor: '#d6d8de',
    dotColor: '#8c8c8c'
  },
  BWReversal: {
    textColor: '#a6b8ff',
    dotColor: '#4d6bfe'
  }
};

export type DeviceTimelineItem = {
  eventId: number;
  filmId: number;
  filmName: string;
  emulsionName: string;
  stockLabel: string | null;
  occurredLabel: string;
  removedLabel: string | null;
  slotLabel: string | null;
  titleColor: string;
  dotColor: string;
};

function parseOccurredAt(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.MIN_SAFE_INTEGER : parsed;
}

export function formatTimelineDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsed);
}

export function mapDeviceLoadEventsToTimeline(events: DeviceLoadTimelineEvent[]): DeviceTimelineItem[] {
  return [...events]
    .sort((left, right) => {
      const leftOccurredAt = parseOccurredAt(left.occurredAt);
      const rightOccurredAt = parseOccurredAt(right.occurredAt);
      if (leftOccurredAt !== rightOccurredAt) {
        return rightOccurredAt - leftOccurredAt;
      }

      return right.eventId - left.eventId;
    })
    .map((event) => {
      const tone = toneByDevelopmentProcess[event.developmentProcessCode] ?? {
        textColor: '#606266',
        dotColor: '#8c8c8c'
      };
      return {
        eventId: event.eventId,
        filmId: event.filmId,
        filmName: event.filmName,
        emulsionName: event.emulsionName,
        stockLabel: event.stockLabel,
        occurredLabel: formatTimelineDate(event.occurredAt),
        removedLabel: event.removedAt ? formatTimelineDate(event.removedAt) : null,
        slotLabel: event.slotSideNumber === null ? null : `Side #${event.slotSideNumber}`,
        titleColor: tone.textColor,
        dotColor: tone.dotColor
      };
    });
}
