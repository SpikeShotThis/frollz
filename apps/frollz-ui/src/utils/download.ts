const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

/**
 * Fetches a URL and triggers a browser file download.
 * Reads the filename from the Content-Disposition response header when available,
 * falling back to the provided fallbackFilename.
 */
export async function triggerDownload(
  path: string,
  fallbackFilename: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackFilename;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
