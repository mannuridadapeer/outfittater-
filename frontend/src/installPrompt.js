// Captures the browser's "install app" prompt so we can trigger it from a button.
// If the app is already installed (or the browser doesn't support it), the
// event never fires, so canInstall() stays false and we hide the button.

let deferred = null;
const listeners = new Set();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((fn) => fn());
  });
}

export function canInstall() {
  return !!deferred;
}

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function promptInstall() {
  if (!deferred) return;
  deferred.prompt();
  try {
    await deferred.userChoice;
  } catch (e) {
    /* ignore */
  }
  deferred = null;
  listeners.forEach((fn) => fn());
}
