import { NextResponse } from 'next/server';
import { isAuthSessionMissingError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getConsentStatus } from '@/lib/privacy/consent-server';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

/** Session-only diagnostic. No household source or delivery operation is attempted. */
export async function GET() {
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (error && isAuthSessionMissingError(error)) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers });
    if (error) return NextResponse.json({ error: 'authentication_unavailable' }, { status: 503, headers });
    if (!data?.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers });
    const ownConsent = await getConsentStatus(client, data.user.id);
    if (ownConsent === 'needed') return NextResponse.json({ error: 'own_consent_required' }, { status: 403, headers });
    if (ownConsent !== 'accepted') return NextResponse.json({ error: 'own_consent_unavailable' }, { status: 503, headers });
    return NextResponse.json({
      own_consent: 'accepted',
      source_state: 'unknown',
      source_capability: { state: 'unavailable', reason: 'population_scope_unprovable' },
      evaluated_at: new Date().toISOString(),
      source_read_at: null,
      aggregates: null,
      recipient_state: 'unknown',
      delivery_state: 'blocked',
    }, { status: 503, headers });
  } catch {
    return NextResponse.json({ error: 'source_unavailable' }, { status: 503, headers });
  }
}
