'use client';

import { useTranslation } from '@frollz2/i18n';

export function DeleteConfirmationName({ name }: { name: string }) {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
      <strong style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{name}</strong>
      <button
        type="button"
        className="icon-btn"
        aria-label={t('clipboard.copyName', { name })}
        title={t('clipboard.copyName', { name })}
        disabled={!name}
        onClick={() => {
          if (!name) return;
          void navigator.clipboard.writeText(name);
        }}
      >
        <i className="bi bi-copy" aria-hidden="true" />
      </button>
    </div>
  );
}
