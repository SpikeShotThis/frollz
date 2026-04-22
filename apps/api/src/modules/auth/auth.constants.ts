export const AUTH_ACCESS_TOKEN_TTL = '15m';
export const AUTH_REFRESH_TOKEN_TTL_DAYS = 30;
export const AUTH_REFRESH_REPLAY_GRACE_SECONDS = Number(process.env['AUTH_REFRESH_REPLAY_GRACE_SECONDS'] ?? '20');

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set`);
  }

  return value;
}

export function requireAuthJwtSecret(): string {
  return requireEnv('JWT_ACCESS_SECRET');
}
