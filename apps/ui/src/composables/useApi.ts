import { useAuthStore } from '../stores/auth.js';
import { readApiError } from './api-envelope.js';
import { router } from '../router/index.js';

export function useApi() {
  const authStore = useAuthStore();

  async function request(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);

    if (authStore.accessToken) {
      headers.set('authorization', `Bearer ${authStore.accessToken}`);
    }

    if (!headers.has('content-type') && init.body !== undefined) {
      headers.set('content-type', 'application/json');
    }

    let response = await fetch(input, { ...init, headers });

    if (response.status === 401 && authStore.refreshToken) {
      const tokenPair = await authStore.refreshAccessToken();

      if (tokenPair) {
        const retryHeaders = new Headers(init.headers);
        retryHeaders.set('authorization', `Bearer ${authStore.accessToken}`);

        response = await fetch(input, { ...init, headers: retryHeaders });
      } else {
        authStore.clearTokens();
        if (router.currentRoute.value.path !== '/login') {
          await router.replace('/login');
        }
      }
    }

    if (!response.ok) {
      throw new Error(await readApiError(response, 'Request failed'));
    }

    return response;
  }

  return { request };
}
