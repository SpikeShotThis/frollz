'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from '@frollz2/i18n';
import { useSession } from '../auth/session';

type NavChild = { href: string; labelKey: string };
type NavEntry =
  | { kind: 'link'; href: string; labelKey: string; icon: NavIconKey }
  | { kind: 'group'; labelKey: string; icon: NavIconKey; baseHref: string; children: NavChild[] };

type NavIconKey = 'home' | 'film' | 'camera' | 'spark' | 'admin' | 'flask' | 'store' | 'archive';

const NAV: NavEntry[] = [
  { kind: 'link', href: '/dashboard', labelKey: 'navigation.dashboard', icon: 'home' },
  {
    kind: 'group',
    labelKey: 'navigation.film',
    icon: 'film',
    baseHref: '/film',
    children: [
      { href: '/film', labelKey: 'navigation.allFilm' },
      { href: '/film?format=35mm', labelKey: 'navigation.film35mm' },
      { href: '/film?format=medium-format', labelKey: 'navigation.filmMediumFormat' },
      { href: '/film?format=large-format', labelKey: 'navigation.filmLargeFormat' },
      { href: '/film?format=instant', labelKey: 'navigation.filmInstant' }
    ]
  },
  {
    kind: 'group',
    labelKey: 'navigation.devices',
    icon: 'camera',
    baseHref: '/devices',
    children: [
      { href: '/devices', labelKey: 'navigation.allDevices' },
      { href: '/devices/cameras', labelKey: 'navigation.cameras' },
      { href: '/devices/interchangeable-backs', labelKey: 'navigation.backs' },
      { href: '/devices/film-holders', labelKey: 'navigation.holders' }
    ]
  },
  {
    kind: 'group',
    labelKey: 'navigation.emulsions',
    icon: 'spark',
    baseHref: '/emulsions',
    children: [
      { href: '/emulsions', labelKey: 'navigation.allEmulsions' },
      { href: '/emulsions/black-and-white', labelKey: 'navigation.blackAndWhite' },
      { href: '/emulsions/black-and-white-reversal', labelKey: 'navigation.bwReversal' },
      { href: '/emulsions/cine-ecn2', labelKey: 'navigation.cineEcn2' },
      { href: '/emulsions/color-negative-c41', labelKey: 'navigation.colorNegativeC41' },
      { href: '/emulsions/color-positive-e6', labelKey: 'navigation.colorPositiveE6' },
      { href: '/emulsions/instant', labelKey: 'navigation.instant' }
    ]
  },
  {
    kind: 'group',
    labelKey: 'navigation.admin',
    icon: 'admin',
    baseHref: '/admin',
    children: [
      { href: '/admin', labelKey: 'navigation.adminOverview' },
      { href: '/admin/film-labs', labelKey: 'navigation.filmLabs' },
      { href: '/admin/film-suppliers', labelKey: 'navigation.filmSuppliers' },
      { href: '/admin/data-export', labelKey: 'navigation.dataExport' }
    ]
  }
];

function NavIcon({ icon, className }: { icon: NavIconKey; className?: string }) {
  const cls = className ?? 'nav-item-icon';
  switch (icon) {
    case 'home':
      return <i className={`bi bi-house ${cls}`} aria-hidden="true" />;
    case 'film':
      return <i className={`bi bi-film ${cls}`} aria-hidden="true" />;
    case 'camera':
      return <i className={`bi bi-camera ${cls}`} aria-hidden="true" />;
    case 'spark':
      return <i className={`bi bi-stars ${cls}`} aria-hidden="true" />;
    case 'admin':
      return <i className={`bi bi-shield-lock ${cls}`} aria-hidden="true" />;
    case 'flask':
      return <i className={`bi bi-flask ${cls}`} aria-hidden="true" />;
    case 'store':
      return <i className={`bi bi-shop ${cls}`} aria-hidden="true" />;
    case 'archive':
      return <i className={`bi bi-archive ${cls}`} aria-hidden="true" />;
  }
}

function ChevronIcon() {
  return <i className="bi bi-chevron-right nav-group-chevron" aria-hidden="true" />;
}

function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('frollz.theme') : null;
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(isDark);
    document.documentElement.dataset['theme'] = isDark ? 'dark' : 'light';
  }, []);

  function toggle() {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.dataset['theme'] = next ? 'dark' : 'light';
      localStorage.setItem('frollz.theme', next ? 'dark' : 'light');
      return next;
    });
  }

  return { dark, toggle };
}

function NavPanel({ onClose, collapsed }: { onClose: () => void; collapsed: boolean }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { user, logout } = useSession();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutLockRef = useRef(false);

  function isGroupActive(entry: Extract<NavEntry, { kind: 'group' }>): boolean {
    return pathname.startsWith(entry.baseHref);
  }

  function toggleGroup(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function isGroupOpen(entry: Extract<NavEntry, { kind: 'group' }>): boolean {
    const explicit = expanded[entry.baseHref];
    if (typeof explicit === 'boolean') return explicit;
    return isGroupActive(entry);
  }

  return (
    <div className="app-nav-panel">
      <div className="app-nav-header">
        <strong>{t('navigation.title')}</strong>
        <button type="button" className="app-nav-close" onClick={onClose} aria-label={t('navigation.closeNav')}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>
      <nav className="app-nav-list" aria-label={t('navigation.primaryLabel')}>
        {NAV.map((entry) => {
          const label = t(entry.labelKey);
          if (entry.kind === 'link') {
            const active = pathname === entry.href;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`nav-item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={collapsed ? label : undefined}
                onClick={onClose}
              >
                <NavIcon icon={entry.icon} />
                <span className="nav-item-label">{label}</span>
              </Link>
            );
          }
          const open = isGroupOpen(entry);
          const groupId = `nav-group-${entry.baseHref.replace(/\W+/g, '-')}`;
          return (
            <div key={entry.baseHref}>
              <button
                type="button"
                className={`nav-group-toggle${open ? ' is-expanded' : ''}`}
                aria-expanded={open}
                aria-controls={groupId}
                aria-label={collapsed ? label : undefined}
                onClick={() => toggleGroup(entry.baseHref)}
              >
                <NavIcon icon={entry.icon} />
                <span className="nav-item-label">{label}</span>
                <ChevronIcon />
              </button>
              {open ? (
                <div id={groupId} className="nav-children">
                  {entry.children.map((child) => {
                    const childPath = child.href.split('?')[0];
                    const active = child.href.includes('?') ? false : pathname === childPath;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`nav-child-item${active ? ' is-active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={onClose}
                      >
                        {t(child.labelKey)}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="nav-footer">
        {user ? <p className="nav-user-info">{user.email ?? user.name}</p> : null}
        <button
          type="button"
          className="nav-item nav-signout-button"
          disabled={isLoggingOut}
          aria-label={isLoggingOut ? t('navigation.signingOut') : t('navigation.signOut')}
          onClick={() => {
            if (logoutLockRef.current || isLoggingOut) return;
            logoutLockRef.current = true;
            setIsLoggingOut(true);
            void logout()
              .then(() => router.replace('/auth/login'))
              .finally(() => {
                logoutLockRef.current = false;
                setIsLoggingOut(false);
              });
          }}
        >
          <i className="bi bi-box-arrow-right" aria-hidden="true" />
          {collapsed ? null : <span>{isLoggingOut ? t('navigation.signingOut') : t('navigation.signOut')}</span>}
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { dark, toggle } = useDarkMode();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setMobileNavOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileNavOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className={`app-shell${collapsed ? ' is-nav-collapsed' : ''}${mobileNavOpen ? ' is-nav-open' : ''}`}>
      <a className="skip-link" href="#main-content">{t('app.skipToContent')}</a>
      <header className="app-topbar">
        <button
          className="topbar-icon-button topbar-hamburger"
          type="button"
          aria-label={t('navigation.openNav')}
          aria-expanded={mobileNavOpen}
          aria-controls="app-navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          <i className="bi bi-list" aria-hidden="true" />
        </button>

        <button
          className="topbar-icon-button topbar-collapse"
          type="button"
          aria-label={collapsed ? t('navigation.expandSidebar') : t('navigation.collapseSidebar')}
          onClick={() => setCollapsed((v) => !v)}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} aria-hidden="true" />
        </button>

        <div className="app-topbar-title">{t('app.name')}</div>

        <button
          className="topbar-icon-button"
          type="button"
          aria-label={dark ? t('theme.switchToLight') : t('theme.switchToDark')}
          onClick={toggle}
        >
          <i className={`bi ${dark ? 'bi-sun' : 'bi-moon'}`} aria-hidden="true" />
        </button>
      </header>

      <div className="app-shell-body">
        <aside id="app-navigation" className="app-nav" aria-label={t('navigation.primaryLabel')}>
          <div className="app-nav-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <NavPanel onClose={() => setMobileNavOpen(false)} collapsed={collapsed} />
        </aside>
        <div id="main-content" className="app-content" tabIndex={-1}>{children}</div>
      </div>
    </div>
  );
}
