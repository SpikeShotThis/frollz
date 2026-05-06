'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../auth/session';
import { AppShell } from './AppShell';

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isSessionInitialized, isAuthenticated } = useSession();

  useEffect(() => {
    if (isSessionInitialized && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isSessionInitialized, router]);

  if (!isSessionInitialized) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }} aria-busy="true">
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--muted-ink)' }}>
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 14 }}>Restoring session…</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
