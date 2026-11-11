import React from 'react';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import PricesV2 from '../PricesV2';
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { household_id: 'h' }, loading: false }) }));
vi.mock('@/hooks/useHousehold', () => ({ useHousehold: () => ({ household: { city: 'חיפה' }, loading: false, updateHousehold: vi.fn().mockResolvedValue(true) }) }));
vi.mock('@/hooks/useCopy', () => ({ useCopy: () => ({ c: (key: string, vars?: Record<string,string>) => { const texts: Record<string,string> = { unavailable: 'לא זמין באזור', denied: 'השוואת המחירים אינה זמינה', unmatched: 'לא מצאנו התאמה', pick: 'בחר מוצר', saved: 'המוצר נבחר', source: 'מחירים מ-{chain}, עודכנו ב-{date}' }; return (texts[key] || key).replace(/\{(\w+)\}/g, (_, k) => vars?.[k] || ''); } }) }));
vi.mock('@/components/prices/candidates-sheet', () => ({ CandidatesSheet: ({onChoose}: {onChoose: (c: object) => void}) => <button onClick={() => onChoose({code:'1', chain:'x', name:'Milk'})}>candidate</button> }));
const store = { chain:'x', chainName:'רשת', storeId:'1', name:'סניף', city:'חיפה', published:'2026-01-01T00:00:00Z', lines:{ milk:null }, foundCount:0, foundTotal:0 };
const data = { origin:{label:'חיפה'}, items:[{key:'milk',canonicalId:'m',qty:1,strict:[],pinned:false}], titles:{milk:'חלב'}, ranked:[store], otherStores:[], verdict:{storeKey:'x:1',basis:'full',savingVsDearest:10}, chains:[], pins:{}, unknownItems:[], commonKeys:[], online:[], labels:{}, split:null };
beforeEach(() => { localStorage.clear(); }); afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function response(body: unknown, status=200) { return { ok:status === 200, status, json:async () => body }; }
it('shows calm not allowed state', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({error:'not found'},404))); render(<PricesV2/>); expect(await screen.findByText('השוואת המחירים אינה זמינה')).toBeTruthy(); });
it('shows unavailable when no stores', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({...data, ranked:[], verdict:null}))); render(<PricesV2/>); expect(await screen.findByText('לא זמין באזור')).toBeTruthy(); });
it('shows source and date and does not invent an unmatched price', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(data))); render(<PricesV2/>); expect(await screen.findByText(/מחירים מ-רשת, עודכנו ב-/)).toBeTruthy(); expect(screen.getByText('לא מצאנו התאמה')).toBeTruthy(); expect(screen.queryByText('0.00 ₪')).toBeNull(); });
it('pins only after the request resolves', async () => { let resolve!: (v:unknown)=>void; const pin = new Promise(r => {resolve=r}); const fetcher = vi.fn((url:string) => url.includes('/pin') ? pin : Promise.resolve(response(data))); vi.stubGlobal('fetch', fetcher); render(<PricesV2/>); fireEvent.click(await screen.findByText('בחר מוצר')); fireEvent.click(screen.getByText('candidate')); expect(screen.queryByText('המוצר נבחר')).toBeNull(); resolve(response({})); await waitFor(() => expect(screen.getByText('המוצר נבחר')).toBeTruthy()); expect(fetcher.mock.calls.some(([u]) => u === '/api/prices/pin')).toBe(true); });
let flag: boolean | null = null;
vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => flag }));
it('renders V1 for unknown and off and toggles without a hook order error', async () => {
 const {default: Page} = await import('@/app/(app)/shopping/prices/page');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({error:'not found'},404)));
 flag=null; const {rerender} = render(<Page/>);
 expect(screen.getByText('השוואת מחירים')).toBeTruthy();
 flag=true; rerender(<Page/>); expect(await screen.findByText('השוואת המחירים אינה זמינה')).toBeTruthy();
 flag=false; rerender(<Page/>); expect(screen.getByText('השוואת מחירים')).toBeTruthy();
});
