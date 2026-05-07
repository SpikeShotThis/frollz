'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiClient } from '@frollz2/api-client';
import type { CurrentUser, LoginRequest, RegisterRequest, TokenPair } from '@frollz2/schema';

const REFRESH_TOKEN_STORAGE_KEY = 'frollz2.refreshToken';
const ACCESS_TOKEN_STORAGE_KEY = 'frollz2.accessToken';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

type SessionContextValue = {
  api: ApiClient;
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isSessionInitialized: boolean;
  isAuthenticated: boolean;
  login: (input: LoginRequest) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<TokenPair | null>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function readStoredValue(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value === null) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isSessionInitialized, setIsSessionInitialized] = useState(false);
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);
  const sessionRestoreInFlightRef = useRef(false);

  function setTokens(tokenPair: TokenPair): void {
    accessTokenRef.current = tokenPair.accessToken;
    refreshTokenRef.current = tokenPair.refreshToken;
    setAccessToken(tokenPair.accessToken);
    setRefreshToken(tokenPair.refreshToken);
    writeStoredValue(ACCESS_TOKEN_STORAGE_KEY, tokenPair.accessToken);
    writeStoredValue(REFRESH_TOKEN_STORAGE_KEY, tokenPair.refreshToken);
  }

  function clearSession(): void {
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    writeStoredValue(ACCESS_TOKEN_STORAGE_KEY, null);
    writeStoredValue(REFRESH_TOKEN_STORAGE_KEY, null);
  }

  function shouldSkipAutoRefresh(url: string): boolean {
    return /\/auth\/(login|register|refresh|logout)\b/.test(url);
  }

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;
    const currentRefreshToken = refreshTokenRef.current;
    if (!currentRefreshToken) return null;

    refreshInFlightRef.current = (async () => {
      try {
        const bootstrapClient = new ApiClient({ baseUrl: API_BASE_URL });
        const tokenPair = await bootstrapClient.refreshTokens({ refreshToken: currentRefreshToken });
        setTokens(tokenPair);
        return tokenPair.accessToken;
      } catch {
        clearSession();
        return null;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    return refreshInFlightRef.current;
  }, []);

  const api = useMemo(
    () =>
      new ApiClient({
        baseUrl: API_BASE_URL,
        getAccessToken: () => accessTokenRef.current,
        fetchImpl: async (input, init) => {
          const url = typeof input === 'string' ? input : input.toString();
          const response = await fetch(input, init);

          if (response.status !== 401) return response;
          if (shouldSkipAutoRefresh(url)) return response;

          const reqHeaders = new Headers(init?.headers);
          if (reqHeaders.get('x-auth-refresh-retry') === '1') {
            clearSession();
            return response;
          }

          const refreshedAccessToken = await refreshAccessToken();
          if (!refreshedAccessToken) return response;

          const retryHeaders = new Headers(init?.headers);
          retryHeaders.set('authorization', `Bearer ${refreshedAccessToken}`);
          retryHeaders.set('x-auth-refresh-retry', '1');
          return fetch(input, {
            ...init,
            headers: retryHeaders
          });
        }
      }),
    [refreshAccessToken]
  );

  useEffect(() => {
    setAccessToken(readStoredValue(ACCESS_TOKEN_STORAGE_KEY));
    setRefreshToken(readStoredValue(REFRESH_TOKEN_STORAGE_KEY));
    setHasHydratedStorage(true);
  }, []);

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }
    if (isSessionInitialized) {
      return;
    }
    if (sessionRestoreInFlightRef.current) {
      return;
    }

    const init = async () => {
      sessionRestoreInFlightRef.current = true;
      if (!refreshToken) {
        setIsSessionInitialized(true);
        sessionRestoreInFlightRef.current = false;
        return;
      }

      try {
        const bootstrapClient = new ApiClient({ baseUrl: API_BASE_URL });
        const tokenPair = await bootstrapClient.refreshTokens({ refreshToken });
        setTokens(tokenPair);
        const meClient = new ApiClient({ baseUrl: API_BASE_URL, getAccessToken: () => tokenPair.accessToken });
        const me = await meClient.getCurrentUser();
        setUser(me);
      } catch {
        clearSession();
      } finally {
        setIsSessionInitialized(true);
        sessionRestoreInFlightRef.current = false;
      }
    };

    void init();
  }, [hasHydratedStorage, isSessionInitialized, refreshToken]);

  async function login(input: LoginRequest): Promise<void> {
    const tokenPair = await api.login(input);
    setTokens(tokenPair);
    const meClient = new ApiClient({ baseUrl: API_BASE_URL, getAccessToken: () => tokenPair.accessToken });
    const me = await meClient.getCurrentUser();
    setUser(me);
  }

  async function register(input: RegisterRequest): Promise<void> {
    const tokenPair = await api.register(input);
    setTokens(tokenPair);
    const meClient = new ApiClient({ baseUrl: API_BASE_URL, getAccessToken: () => tokenPair.accessToken });
    const me = await meClient.getCurrentUser();
    setUser(me);
  }

  async function refresh(): Promise<TokenPair | null> {
    if (!refreshTokenRef.current) {
      return null;
    }

    try {
      const tokenPair = await api.refreshTokens({ refreshToken: refreshTokenRef.current });
      setTokens(tokenPair);
      return tokenPair;
    } catch {
      clearSession();
      return null;
    }
  }

  async function logout(): Promise<void> {
    if (refreshToken) {
      try {
        await api.logout({ refreshToken });
      } catch {
        // ignore logout network failures
      }
    }

    clearSession();
  }

  const value: SessionContextValue = {
    api,
    user,
    accessToken,
    refreshToken,
    isSessionInitialized,
    isAuthenticated: Boolean(accessToken || user),
    login,
    register,
    logout,
    refresh
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);

  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return ctx;
}
