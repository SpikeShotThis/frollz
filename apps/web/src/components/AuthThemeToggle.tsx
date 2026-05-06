'use client';

import { useEffect, useState } from 'react';

export function AuthThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('frollz.theme') : null;
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(isDark);
    document.documentElement.dataset['theme'] = isDark ? 'dark' : 'light';
  }, []);

  function toggleTheme() {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.dataset['theme'] = next ? 'dark' : 'light';
      localStorage.setItem('frollz.theme', next ? 'dark' : 'light');
      return next;
    });
  }

  return (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 20 }}>
      <button
        className="icon-btn"
        type="button"
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={toggleTheme}
      >
        <i className={`bi ${dark ? 'bi-sun' : 'bi-moon'}`} aria-hidden="true" />
      </button>
    </div>
  );
}
