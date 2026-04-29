import { describe, expect, it } from 'vitest';
import type { DeviceLoadTimelineEvent } from '@frollz2/schema';
import { mapDeviceLoadEventsToTimeline } from './device-detail-timeline.js';

function makeEvent(input: Partial<DeviceLoadTimelineEvent> & Pick<DeviceLoadTimelineEvent, 'eventId'>): DeviceLoadTimelineEvent {
  return {
    eventId: input.eventId,
    filmId: input.filmId ?? 10 + input.eventId,
    filmName: input.filmName ?? `Film ${input.eventId}`,
    emulsionName: input.emulsionName ?? 'Kodak Gold 200',
    stockLabel: input.stockLabel ?? null,
    developmentProcessCode: input.developmentProcessCode ?? 'C41',
    occurredAt: input.occurredAt ?? '2026-01-01T10:00:00.000Z',
    removedAt: input.removedAt ?? null,
    slotSideNumber: input.slotSideNumber ?? null
  };
}

describe('device detail timeline helpers', () => {
  it('sorts by most recent and maps row content fields', () => {
    const timeline = mapDeviceLoadEventsToTimeline([
      makeEvent({
        eventId: 1,
        filmName: 'Older roll',
        emulsionName: 'Kodak Tri-X 400',
        occurredAt: '2026-01-01T10:00:00.000Z',
        removedAt: '2026-01-01T11:00:00.000Z',
        slotSideNumber: 2
      }),
      makeEvent({
        eventId: 2,
        filmName: 'Newest roll',
        emulsionName: 'Kodak Gold 200',
        occurredAt: '2026-01-01T12:00:00.000Z'
      })
    ]);

    expect(timeline.map((entry) => entry.filmName)).toEqual(['Newest roll', 'Older roll']);
    expect(timeline[0]?.emulsionName).toBe('Kodak Gold 200');
    expect(timeline[0]?.stockLabel).toBeNull();
    expect(timeline[0]?.occurredLabel.length).toBeGreaterThan(0);
    expect(timeline[0]?.removedLabel).toBeNull();
    expect(timeline[0]?.slotLabel).toBeNull();
    expect(timeline[1]?.removedLabel?.length).toBeGreaterThan(0);
    expect(timeline[1]?.slotLabel).toBe('Side #2');
  });

  it('maps process code to title/dot colors', () => {
    const timeline = mapDeviceLoadEventsToTimeline([
      makeEvent({ eventId: 1, filmName: 'BW film', developmentProcessCode: 'BW' }),
      makeEvent({ eventId: 2, filmName: 'BW reversal film', developmentProcessCode: 'BWReversal' }),
      makeEvent({ eventId: 3, filmName: 'E6 film', developmentProcessCode: 'E6' })
    ]);

    const bw = timeline.find((entry) => entry.filmName === 'BW film');
    const bwReversal = timeline.find((entry) => entry.filmName === 'BW reversal film');
    const e6 = timeline.find((entry) => entry.filmName === 'E6 film');

    expect(bw?.dotColor).toBe('#8c8c8c');
    expect(bw?.titleColor).toBe('#d6d8de');
    expect(bwReversal?.dotColor).toBe('#4d6bfe');
    expect(e6?.dotColor).toBe('#2080f0');
  });
});
