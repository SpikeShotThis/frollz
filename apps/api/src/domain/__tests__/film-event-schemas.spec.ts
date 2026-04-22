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
          filmUnitId: 1,
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
          filmUnitId: 7,
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
          loadTargetType: 'film_holder_slot',
          filmHolderId: 2,
          slotNumber: 1,
          intendedPushPull: null
        }
      })
    ).toThrow();
  });
});
