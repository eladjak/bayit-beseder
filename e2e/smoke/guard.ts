/** Classify a target before any browser or server is started. */
export function targetMode(baseUrl: string, allowProductionReadonly: string | undefined): 'readonly' | 'full' {
  const url = new URL(baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
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
