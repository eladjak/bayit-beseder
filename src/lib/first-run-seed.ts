export type StarterTask = { title: string; category: string; estimatedMinutes: number; recurring: boolean; frequency: string };

export async function runStarterSeed(fetchImpl: typeof fetch, tasks?: StarterTask[]): Promise<{ ok: true; seeded: boolean } | { ok: false; reason: string }> {
  try {
    const response = await fetchImpl('/api/seed', tasks === undefined
      ? { method: 'POST' }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks }) });
    if (!response.ok) return { ok: false, reason: 'http' };
    const data = await response.json();
    if (data?.seeded === true) return { ok: true, seeded: true };
    if (data?.seeded === false && data?.message === 'Tasks already exist') return { ok: true, seeded: false };
    return { ok: false, reason: 'not-seeded' };
  } catch {
    return { ok: false, reason: 'network-or-invalid-response' };
  }
}
