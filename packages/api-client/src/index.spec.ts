import { describe, expect, it } from 'vitest';
import { ApiClient } from './index.js';

describe('ApiClient', () => {
  it('attaches bearer token and parses response', async () => {
    const client = new ApiClient({
      baseUrl: 'http://localhost:3000',
      getAccessToken: () => 'token-123',
      fetchImpl: async (_input, init) => {
        const headers = new Headers(init?.headers);
        expect(headers.get('authorization')).toBe('Bearer token-123');

        return new Response(
          JSON.stringify({
            data: {
              accessToken: 'a',
              refreshToken: 'r'
            }
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
    });

    const response = await client.login({ email: 'test@example.com', password: 'secret' });
    expect(response.accessToken).toBe('a');
  });

  it('attaches idempotency keys to mutating requests', async () => {
    const client = new ApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async (_input, init) => {
        const headers = new Headers(init?.headers);
        expect(headers.get('idempotency-key')).toBeTruthy();

        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      }
    });

    await client.deleteDevice(123);
  });

  it('preserves explicit idempotency keys', async () => {
    const client = new ApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async (_input, init) => {
        const headers = new Headers(init?.headers);
        expect(headers.get('idempotency-key')).toBe('fixed-key');

        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      }
    });

    await client.deleteEmulsion(123, 'fixed-key');
  });

  it('fetches typed reference values without exposing raw response handling', async () => {
    const client = new ApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async (input) => {
        expect(String(input)).toBe('http://localhost:3000/reference/values?kind=manufacturer&q=kod&limit=10');

        return new Response(
          JSON.stringify({
            data: [
              {
                id: 1,
                userId: 2,
                kind: 'manufacturer',
                value: 'Kodak',
                normalizedValue: 'kodak',
                usageCount: 3,
                lastUsedAt: '2026-05-05T00:00:00.000Z'
              }
            ]
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
    });

    await expect(client.getReferenceValues({ kind: 'manufacturer', q: 'kod', limit: 10 }))
      .resolves
      .toEqual([
        {
          id: 1,
          userId: 2,
          kind: 'manufacturer',
          value: 'Kodak',
          normalizedValue: 'kodak',
          usageCount: 3,
          lastUsedAt: '2026-05-05T00:00:00.000Z'
        }
      ]);
  });

  it('fetches typed device load events', async () => {
    const client = new ApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async (input) => {
        expect(String(input)).toBe('http://localhost:3000/devices/42/load-events');

        return new Response(
          JSON.stringify({
            data: [
              {
                eventId: 10,
                filmId: 20,
                filmName: 'Roll 1',
                emulsionName: 'Kodak Portra 400',
                stockLabel: '36 exposures',
                developmentProcessCode: 'C41',
                occurredAt: '2026-05-05T00:00:00.000Z',
                removedAt: null,
                slotSideNumber: null
              }
            ]
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
    });

    const events = await client.getDeviceLoadEvents(42);
    expect(events).toHaveLength(1);
    expect(events[0]?.filmName).toBe('Roll 1');
  });
});
