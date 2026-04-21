type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

type ApiErrorEnvelope = {
  error?: {
    message?: unknown;
  };
};

export async function readApiData<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json();

  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

export async function readApiError(response: Response, fallbackMessage: string): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);

  if (payload && typeof payload === 'object') {
    const error = (payload as ApiErrorEnvelope).error;
    if (error && typeof error.message === 'string' && error.message.length > 0) {
      return error.message;
    }
  }

  return fallbackMessage;
}
