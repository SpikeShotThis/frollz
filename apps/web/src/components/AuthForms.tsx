'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeLocale, i18n, LOCALES, useTranslation } from '@frollz2/i18n';
import type { Locale } from '@frollz2/i18n';
import { loginRequestSchema, registerRequestSchema } from '@frollz2/schema';
import { useSession } from '../auth/session';
import { resolveApiError } from '../utils/resolve-api-error';

function LocalePicker() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<Locale>((i18n.language as Locale) ?? 'en');

  function handleChange(locale: Locale) {
    changeLocale(locale);
    setCurrent(locale);
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 20 }}>
      <label htmlFor="locale-select" style={{ fontSize: 13, color: 'var(--muted-ink)', marginRight: 8 }}>
        {t('locale.selectLabel')}
      </label>
      <select
        id="locale-select"
        value={current}
        onChange={(e) => handleChange(e.target.value as Locale)}
        style={{ fontSize: 13, padding: '4px 8px', width: 'auto' }}
      >
        {(Object.entries(LOCALES) as [Locale, string][]).map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </div>
  );
}

export function LoginForm() {
  const { t } = useTranslation();
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
        <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700 }}>{t('auth.signIn')}</h1>
        <p style={{ margin: 0, color: 'var(--muted-ink)', fontSize: 15 }}>{t('auth.signInWelcome')}</p>
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
            setError(resolveApiError(err, t, t('auth.loginFailed')));
          } finally {
            submitLockRef.current = false;
            setLoading(false);
          }
        }}
      >
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        <fieldset disabled={loading} style={{ margin: 0, padding: 0, border: 'none' }}>
        <legend className="sr-only">{t('auth.signInLegend')}</legend>
        <div className="form-field">
          <label htmlFor="login-email">{t('auth.email')}</label>
          <input id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
        </div>
        <div className="form-field">
          <label htmlFor="login-password">{t('auth.password')}</label>
          <input id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
          {loading ? t('auth.signingIn') : t('auth.signIn')}
        </button>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: 'var(--muted-ink)' }}>
          {t('auth.noAccount')}{' '}
          <Link href="/auth/register" style={{ textDecoration: 'underline' }}>{t('auth.register')}</Link>
        </p>
        </fieldset>
      </form>
      <LocalePicker />
    </div>
  );
}

export function RegisterForm() {
  const { t } = useTranslation();
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
        <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700 }}>{t('auth.createAccount')}</h1>
        <p style={{ margin: 0, color: 'var(--muted-ink)', fontSize: 15 }}>{t('auth.createAccountTagline')}</p>
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
            setError(resolveApiError(err, t, t('auth.registrationFailed')));
          } finally {
            submitLockRef.current = false;
            setLoading(false);
          }
        }}
      >
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        <fieldset disabled={loading} style={{ margin: 0, padding: 0, border: 'none' }}>
        <legend className="sr-only">{t('auth.createAccountLegend')}</legend>
        <div className="form-field">
          <label htmlFor="reg-name">{t('auth.fullName')}</label>
          <input id="reg-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </div>
        <div className="form-field">
          <label htmlFor="reg-email">{t('auth.email')}</label>
          <input id="reg-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
        </div>
        <div className="form-field">
          <label htmlFor="reg-password">{t('auth.password')}</label>
          <input id="reg-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" minLength={8} required aria-describedby="reg-password-help" />
          <p id="reg-password-help" className="field-help">{t('auth.passwordHelp')}</p>
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
          {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
        </button>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: 'var(--muted-ink)' }}>
          {t('auth.alreadyHaveAccount')}{' '}
          <Link href="/auth/login" style={{ textDecoration: 'underline' }}>{t('auth.signIn')}</Link>
        </p>
        </fieldset>
      </form>
      <LocalePicker />
    </div>
  );
}
