import { ApiClient } from '@frollz2/api-client';

export const api = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1'
});
