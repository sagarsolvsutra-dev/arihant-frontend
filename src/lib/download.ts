// Every Excel/PDF export used to be a plain `window.open(url, "_blank")`
// navigation. That's what caused the "clicking Excel refreshes the whole
// page" bug: a bare `window.open()` call is fragile in real browsers — a
// strict popup blocker, a download-manager extension, or simply the popup
// being disallowed can make the browser fall back to navigating the CURRENT
// tab to the file URL instead of opening a new one, which looks exactly
// like a full page reload (filters reset, table reloads, scroll resets).
//
// Fetching the file as a blob and clicking a throwaway `<a download>` never
// opens a new tab/window at all, so there's nothing for a popup blocker or
// extension to intercept, and the current page is never navigated. As a
// bonus, this switches the auth mechanism back to a normal `Authorization`
// header instead of a token riding along in the URL's query string.
export async function downloadFile(url: string, fallbackFilename: string): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // Not a JSON error body — keep the generic message.
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match ? match[1] : fallbackFilename;

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
