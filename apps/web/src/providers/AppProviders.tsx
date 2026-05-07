'use client';

import type { ReactNode } from 'react';
import '@frollz2/i18n';
import { SessionProvider } from '../auth/session';

export function AppProviders({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
