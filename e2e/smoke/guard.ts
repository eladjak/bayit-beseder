/** Classify a target before any browser or server is started. */
export function targetMode(baseUrl: string, allowProductionReadonly: string | undefined): 'readonly' | 'full' {
  const url = new URL(baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Invalid smoke target');
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const production = hostname === 'bayit-beseder.vercel.app' || hostname === 'bayitbeseder.com' || hostname === 'www.bayitbeseder.com';
  if (production) {
    if (allowProductionReadonly !== '1') throw new Error('Production smoke target is blocked');
    return 'readonly';
  }
  return 'full';
}

/** Reject cross-origin production redirects and enforce read-only requests. */
export function requestAllowed(url: string, method: string, base: string, mode: 'full' | 'readonly', local: boolean): boolean {
  const u = new URL(url);
  if (local && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return false;
  if (mode === 'full' && targetMode(u.origin, '1') === 'readonly') return false;
  if (mode === 'readonly' && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return u.origin !== new URL(base).origin && method === 'POST' && ['/auth/v1/token', '/auth/v1/logout'].includes(u.pathname);
  }
  return true;
}
