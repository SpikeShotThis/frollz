import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../src/locales');

function pseudoLocalize(str: string): string {
  const preservedTokenPattern = /(\{\{[^}]+\}\})/;
  const parts = str.split(preservedTokenPattern);
  return parts
    .map((part) => (preservedTokenPattern.test(part) ? part : part.split('').reverse().join('')))
    .join('');
}

function deepTransform(value: unknown): unknown {
  if (typeof value === 'string') return pseudoLocalize(value);
  if (Array.isArray(value)) return value.map(deepTransform);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, deepTransform(v)])
    );
  }
  return value;
}

const en = JSON.parse(readFileSync(join(localesDir, 'en.json'), 'utf-8')) as unknown;
const pseudo = deepTransform(en);
writeFileSync(join(localesDir, 'pseudo.json'), JSON.stringify(pseudo, null, 2) + '\n');

console.log('✓ pseudo.json generated from en.json');
