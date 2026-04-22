import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { currentUserSchema, tokenPairSchema, type CurrentUser, type LoginRequest, type RegisterRequest, type TokenPair } from '@frollz2/schema';
import { readApiData } from '../composables/api-envelope.js';

const REFRESH_TOKEN_STORAGE_KEY = 'frollz2.refreshToken';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null);
  // Refresh tokens are persisted in localStorage per the product requirement so sessions survive reloads.
  // That is a deliberate tradeoff: it improves UX, but it also means the token must be protected against XSS.
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY));
  const user = ref<CurrentUser | null>(null);
  const isSessionInitialized = ref(false);
  let restoreSessionInFlight: Promise<void> | null = null;
  let refreshInFlight: Promise<TokenPair | null> | null = null;

  const isAuthenticated = computed(() => accessToken.value !== null);

  async function readErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
    const payload: unknown = await response.json().catch(() => null);

    if (payload && typeof payload === 'object' && 'error' in payload) {
      const error = (payload as { error?: { message?: unknown } }).error;

      if (error && typeof error.message === 'string' && error.message.length > 0) {
        return error.message;
      }
    }

    return fallbackMessage;
  }

  async function loadCurrentUser(accessTokenValue: string): Promise<void> {
    const userResponse = await fetch('/api/v1/auth/me', {
      headers: { authorization: `Bearer ${accessTokenValue}` }
    });

    if (!userResponse.ok) {
      throw new Error(await readErrorMessage(userResponse, 'Failed to load current user'));
    }

    user.value = currentUserSchema.parse(await readApiData(userResponse));
  }

  async function restoreSession(): Promise<void> {
    if (restoreSessionInFlight) {
      return restoreSessionInFlight;
    }

    restoreSessionInFlight = (async () => {
      if (!refreshToken.value) {
        isSessionInitialized.value = true;
        return;
      }

      const tokenPair = await refreshAccessToken();

      if (!tokenPair) {
        isSessionInitialized.value = true;
        return;
      }

      try {
        await loadCurrentUser(tokenPair.accessToken);
      } catch {
        clearTokens();
      }

      isSessionInitialized.value = true;
    })();

    try {
      await restoreSessionInFlight;
    } finally {
      restoreSessionInFlight = null;
    }
  }

  async function refreshAccessToken(): Promise<TokenPair | null> {
    if (!refreshToken.value) {
      return null;
    }

    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = (async () => {
      const activeRefreshToken = refreshToken.value;

      if (!activeRefreshToken) {
        return null;
      }

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: activeRefreshToken })
      });

      if (!response.ok) {
        if (refreshToken.value === activeRefreshToken) {
          clearTokens();
        }
        return null;
      }

      const tokenPair = tokenPairSchema.parse(await readApiData(response));
      setTokens(tokenPair);
      return tokenPair;
    })();

    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  }

  function setTokens(tokenPair: TokenPair): void {
    accessToken.value = tokenPair.accessToken;
    refreshToken.value = tokenPair.refreshToken;
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokenPair.refreshToken);
  }

  function clearTokens(): void {
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }

  async function login(input: LoginRequest): Promise<void> {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Login failed'));
    }

    const tokenPair = tokenPairSchema.parse(await readApiData(response));
    setTokens(tokenPair);

    try {
      await loadCurrentUser(tokenPair.accessToken);
    } catch (error) {
      clearTokens();
      throw error;
    }
  }

  async function register(input: RegisterRequest): Promise<void> {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Registration failed'));
    }

    const tokenPair = tokenPairSchema.parse(await readApiData(response));
    setTokens(tokenPair);

    try {
      await loadCurrentUser(tokenPair.accessToken);
    } catch (error) {
      clearTokens();
      throw error;
    }
  }

  async function logout(): Promise<void> {
    if (refreshToken.value) {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (accessToken.value) {
        headers.authorization = `Bearer ${accessToken.value}`;
      }

      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken: refreshToken.value })
      });
    }

    clearTokens();
  }

  return {
    accessToken,
    refreshToken,
    user,
    isSessionInitialized,
    isAuthenticated,
    restoreSession,
    refreshAccessToken,
    setTokens,
    clearTokens,
    login,
    register,
    logout
  };
});
