'use client';

import { useEffect, useId, useState } from 'react';
import type { ReferenceValueKind } from '@frollz2/schema';
import { useSession } from '../auth/session';

type ReferenceTypeaheadInputProps = {
  id: string;
  label: string;
  kind: ReferenceValueKind;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  type?: string;
  placeholder?: string;
};

export function ReferenceTypeaheadInput({
  id,
  label,
  kind,
  value,
  onChange,
  disabled = false,
  required = false,
  type = 'text',
  placeholder
}: ReferenceTypeaheadInputProps) {
  const { api } = useSession();
  const generatedId = useId();
  const suggestionsId = `${id || generatedId}-suggestions`;
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (disabled || !value.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const values = await api.getReferenceValues({
            kind,
            q: value,
            limit: 10
          });
          setSuggestions(values.map((entry) => entry.value));
        } catch {
          setSuggestions([]);
        }
      })();
    }, 150);

    return () => clearTimeout(timeout);
  }, [api, disabled, kind, value]);

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={suggestionsId}
      />
      {suggestions.length > 0 ? (
        <div id={suggestionsId} role="listbox" className="suggestion-list" aria-label={`${label} suggestions`}>
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" role="option" className="suggestion-option" onClick={() => onChange(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
