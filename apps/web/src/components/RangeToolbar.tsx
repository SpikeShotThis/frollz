'use client';

import type { InsightRange } from '@frollz2/schema';

export const RANGE_OPTIONS: Array<{ value: InsightRange; label: string }> = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '365d', label: '365 days' },
  { value: 'all', label: 'All time' }
];

export function RangeToolbar({
  range,
  onRangeChange,
  id = 'range-select'
}: {
  range: InsightRange;
  onRangeChange: (range: InsightRange) => void;
  id?: string;
}) {
  return (
    <section className="card">
      <div className="form-field" style={{ marginBottom: 0, maxWidth: 220 }}>
        <label htmlFor={id}>Range</label>
        <select id={id} value={range} onChange={(event) => onRangeChange(event.target.value as InsightRange)}>
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </section>
  );
}
