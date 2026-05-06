import type { Metadata } from 'next';
import { LoginForm } from '../../../src/components/AuthForms';

export const metadata: Metadata = {
  title: 'frollz::Sign In'
};

export default function LoginPage() {
  return (
    <main>
      <LoginForm />
    </main>
  );
}
