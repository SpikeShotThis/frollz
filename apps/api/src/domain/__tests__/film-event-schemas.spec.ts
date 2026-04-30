import { describe, expect, it } from 'vitest';
import {
  filmJourneyEventPayloadSchema
} from '@frollz2/schema';

describe('filmJourneyEventPayloadSchema', () => {
  it('parses valid explicit loaded payloads', () => {
    expect(
      filmJourneyEventPayloadSchema.parse({
        filmStateCode: 'loaded',
        eventData: {
          loadTargetType: 'camera_direct',
          cameraId: 2,
          intendedPushPull: null
        }
      })
    ).toMatchObject({ filmStateCode: 'loaded' });
  });

  it('parses valid explicit load-target payloads', () => {
    expect(
      filmJourneyEventPayloadSchema.parse({
        filmStateCode: 'loaded',
        eventData: {
          loadTargetType: 'film_holder_slot',
          filmHolderId: 3,
          slotNumber: 2,
          intendedPushPull: null
        }
      })
    ).toMatchObject({ filmStateCode: 'loaded' });
  });

  it('parses valid stored payloads', () => {
    expect(
      filmJourneyEventPayloadSchema.parse({
        filmStateCode: 'stored',
        eventData: {
          storageLocationId: 1,
          storageLocationCode: 'freezer'
        }
      })
    ).toMatchObject({ filmStateCode: 'stored' });
  });

  it('rejects invalid payloads', () => {
    expect(() =>
      filmJourneyEventPayloadSchema.parse({
        filmStateCode: 'loaded',
        eventData: {
          loadTargetType: 'camera_direct',
          intendedPushPull: null
        }
      })
    ).toThrow();
  });

  it('parses sent_for_dev payloads with required labId', () => {
    expect(
      filmJourneyEventPayloadSchema.parse({
        filmStateCode: 'sent_for_dev',
        eventData: {
          labId: 7,
          actualPushPull: null,
          cost: { amount: 12.5, currencyCode: 'USD' }
        }
      })
    ).toMatchObject({ filmStateCode: 'sent_for_dev' });
  });

  it('rejects sent_for_dev payloads with invalid currency code', () => {
    expect(() =>
      filmJourneyEventPayloadSchema.parse({
        filmStateCode: 'sent_for_dev',
        eventData: {
          labId: 7,
          actualPushPull: null,
          cost: { amount: 10, currencyCode: 'usd' }
        }
      })
    ).toThrow();
  });

  it('rejects sent_for_dev payloads without labId', () => {
    expect(() =>
      filmJourneyEventPayloadSchema.parse({
        filmStateCode: 'sent_for_dev',
        eventData: {
          labName: 'Legacy Lab',
          actualPushPull: null
        }
      })
    ).toThrow();
  });
});
