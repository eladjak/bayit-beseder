import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthSessionMissingError } from '@supabase/supabase-js';
const h=vi.hoisted(()=>({user:null as null|{id:string}, authError:null as null|object, consent:'accepted', getConsent:vi.fn(), from:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:h.user},error:h.authError})},from:h.from})}));
vi.mock('@/lib/privacy/consent-server',()=>({getConsentStatus:async(...args:unknown[])=>{h.getConsent(...args);return h.consent}}));
import { GET } from '../route';
beforeEach(()=>{h.user=null;h.authError=null;h.consent='accepted';h.getConsent.mockReset();h.from.mockReset();});
describe('session-only source readiness',()=>{
 it('rejects anonymous and does not read consent or household',async()=>{const r=await GET();expect(r.status).toBe(401);expect(h.getConsent).not.toHaveBeenCalled();expect(h.from).not.toHaveBeenCalled();});
 it('classifies missing session as unauthenticated',async()=>{h.authError=new AuthSessionMissingError();expect((await GET()).status).toBe(401);expect(h.getConsent).not.toHaveBeenCalled();expect(h.from).not.toHaveBeenCalled();});
 it('keeps authentication errors unknown and does not read data',async()=>{h.authError={};expect((await GET()).status).toBe(503);expect(h.getConsent).not.toHaveBeenCalled();expect(h.from).not.toHaveBeenCalled();});
 it.each([['needed',403],['unavailable',503],['unexpected',503]])('consent %s refuses before household read',async(state,status)=>{h.user={id:'fixture'};h.consent=state;expect((await GET()).status).toBe(status);expect(h.from).not.toHaveBeenCalled();});
 it('reports evaluated time but no source-read time, count, recipient or delivery claim',async()=>{h.user={id:'fixture'};const r=await GET();const body=await r.json();expect(r.status).toBe(503);expect(body).toMatchObject({own_consent:'accepted',source_state:'unknown',source_capability:{state:'unavailable',reason:'population_scope_unprovable'},source_read_at:null,aggregates:null,recipient_state:'unknown',delivery_state:'blocked'});expect(Number.isFinite(Date.parse(body.evaluated_at))).toBe(true);expect(r.headers.get('cache-control')).toBe('private, no-store');expect(h.from).not.toHaveBeenCalled();expect(JSON.stringify(body)).not.toContain('fixture');});
});
