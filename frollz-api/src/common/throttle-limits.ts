export const ThrottleLimits = {
  _10_REQUESTS_PER_MINUTE: { ttl: 60000, limit: 10 },
  _20_REQUESTS_PER_MINUTE: { ttl: 60000, limit: 20 },
  _30_REQUESTS_PER_MINUTE: { ttl: 60000, limit: 30 },
  _100_REQUESTS_PER_MINUTE: { ttl: 60000, limit: 100 },
} as const;
