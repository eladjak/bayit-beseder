import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET as morning } from '../daily-brief/route';
import { GET as evening } from '../daily-summary/route';
const req=(value:string|null)=>({headers:{get:()=>value}}) as unknown as NextRequest;
beforeEach(()=>{process.env.CRON_SECRET='fixture-secret';});
describe('scheduled report containment',()=>{
 for(const [name,handler] of [['morning',morning],['evening',evening]] as const) {
  it(`${name} rejects unauthenticated request`,async()=>{expect((await handler(req(null))).status).toBe(401);});
  it(`${name} fails closed without source read or network`,async()=>{const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{throw Error('unexpected network')});try{const r=await handler(req('Bearer fixture-secret'));const body=await r.json();expect(r.status).toBe(503);expect(body.source_read_at).toBeNull();expect(body.error).toBe('report_source_or_recipient_unverified');expect(fetch).not.toHaveBeenCalled();}finally{fetch.mockRestore();}});
 }
});
