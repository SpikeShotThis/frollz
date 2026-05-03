import type { ReactNode } from 'react';
import { AuthThemeToggle } from '../../src/components/AuthThemeToggle';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthThemeToggle />
      {children}
    </>
  );
}
