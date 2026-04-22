import { describe, expect, it } from 'vitest';
import {
  filmJourneyEventPayloadSchema
} from '@frollz2/schema';

describe('filmJourneyEventPayloadSchema', () => {
  it('parses valid loaded payloads', () => {
    expect(
      filmJourneyEventPayloadSchema.parse({
        filmStateCode: 'loaded',
        eventData: {
          deviceId: 1,
          slotSideNumber: 1,
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
          slotSideNumber: 1
        }
      })
    ).toThrow();
  });
});
