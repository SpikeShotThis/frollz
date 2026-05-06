'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginRequestSchema, registerRequestSchema } from '@frollz2/schema';
import { useSession } from '../auth/session';

export function LoginForm() {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700 }}>Sign in</h1>
        <p style={{ margin: 0, color: 'var(--muted-ink)', fontSize: 15 }}>Welcome back to frollz.</p>
      </div>
      <form
        className="card"
        style={{ padding: 24 }}
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitLockRef.current || loading) return;
          submitLockRef.current = true;
          setLoading(true);
          setError(null);
          try {
            const payload = loginRequestSchema.parse({ email, password });
            await login(payload);
            router.replace('/dashboard');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
          } finally {
            submitLockRef.current = false;
            setLoading(false);
          }
        }}
      >
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        <fieldset disabled={loading} style={{ margin: 0, padding: 0, border: 'none' }}>
        <legend className="sr-only">Sign in credentials</legend>
        <div className="form-field">
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
        </div>
        <div className="form-field">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: 'var(--muted-ink)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" style={{ textDecoration: 'underline' }}>Register</Link>
        </p>
        </fieldset>
      </form>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { register } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700 }}>Create account</h1>
        <p style={{ margin: 0, color: 'var(--muted-ink)', fontSize: 15 }}>Start tracking your film workflow.</p>
      </div>
      <form
        className="card"
        style={{ padding: 24 }}
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitLockRef.current || loading) return;
          submitLockRef.current = true;
          setLoading(true);
          setError(null);
          try {
            const payload = registerRequestSchema.parse({ name, email, password });
            await register(payload);
            router.replace('/dashboard');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
          } finally {
            submitLockRef.current = false;
            setLoading(false);
          }
        }}
      >
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        <fieldset disabled={loading} style={{ margin: 0, padding: 0, border: 'none' }}>
        <legend className="sr-only">Create account details</legend>
        <div className="form-field">
          <label htmlFor="reg-name">Full name</label>
          <input id="reg-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </div>
        <div className="form-field">
          <label htmlFor="reg-email">Email address</label>
          <input id="reg-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
        </div>
        <div className="form-field">
          <label htmlFor="reg-password">Password</label>
          <input id="reg-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" minLength={8} required aria-describedby="reg-password-help" />
          <p id="reg-password-help" className="field-help">Minimum 8 characters.</p>
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: 'var(--muted-ink)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ textDecoration: 'underline' }}>Sign in</Link>
        </p>
        </fieldset>
      </form>
    </div>
  );
}
