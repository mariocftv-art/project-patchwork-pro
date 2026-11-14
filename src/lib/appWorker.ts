/** Only the published, top-level app may register the offline worker. */
export function refusesAppWorker(host: string, production: boolean, framed: boolean, disabled: boolean): boolean {
  const hostname = host.toLowerCase();
  const previewSuffix = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(hostname);
  const label = hostname.split('.')[0];
  return !production || framed || disabled ||
    (previewSuffix && (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label) || /^project--.+-dev$/.test(label))) ||
    /(^|\.)(lovableproject\.com|lovableproject-dev\.com|beta\.lovable\.dev)$/.test(hostname);
}

export async function startAppWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (refusesAppWorker(window.location.hostname, import.meta.env.PROD, window.self !== window.top, new URLSearchParams(window.location.search).get('sw') === 'off')) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((r) => {
      const worker = r.active ?? r.waiting ?? r.installing;
      return worker && new URL(worker.scriptURL).pathname === '/sw.js';
    }).map((r) => r.unregister()));
    return;
  }
  await navigator.serviceWorker.register('/sw.js');
}