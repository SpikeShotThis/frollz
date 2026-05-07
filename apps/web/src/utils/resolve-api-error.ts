import { ApiError } from '@frollz2/api-client';
import type { TFunction } from '@frollz2/i18n';

export function resolveApiError(err: unknown, t: TFunction, fallback: string): string {
  if (err instanceof ApiError) {
    return t(err.msg.label, { ...err.msg.params, defaultValue: err.msg.en });
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
