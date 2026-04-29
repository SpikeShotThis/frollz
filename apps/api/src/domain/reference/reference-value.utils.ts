export function normalizeReferenceValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function sanitizeReferenceValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
