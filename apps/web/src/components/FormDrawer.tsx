'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from '@frollz2/i18n';

export function FormDrawer({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const drawerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    drawerRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop is-open" onClick={onClose} aria-hidden="true" />
      <aside
        ref={drawerRef}
        className="form-drawer is-open"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="form-drawer-header">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">{title}</h2>
          <button className="secondary" type="button" onClick={onClose} aria-label={`Close ${title}`}>{t('formDrawer.close')}</button>
        </div>
        <div className="form-drawer-body space-y-3">{children}</div>
      </aside>
    </>
  );
}
