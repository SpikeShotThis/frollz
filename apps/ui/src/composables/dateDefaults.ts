function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function currentDateLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function dateToISODateTime(dateStr: string): string {
  const now = new Date();
  return `${dateStr}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}Z`;
}
