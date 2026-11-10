import { describe, it, expect, vi } from 'vitest';
import { runStarterSeed } from '../first-run-seed';

describe('starter seed', () => {
  const response = (body: string, status = 200) => vi.fn().mockResolvedValue(new Response(body, { status }));
  it.each([
    ['created', '{"seeded":true}', 200, true],
    ['existing', '{"seeded":false,"message":"Tasks already exist"}', 200, true],
    ['not seeded', '{"seeded":false}', 200, false],
    ['http error', '{"seeded":true}', 500, false],
    ['malformed', '{', 200, false],
  ])('%s', async (_name, body, status, ok) => {
    expect((await runStarterSeed(response(body, status))).ok).toBe(ok);
  });
  it('handles a network rejection', async () => {
    expect((await runStarterSeed(vi.fn().mockRejectedValue(new Error('offline')))).ok).toBe(false);
  });
  it('sends the selected tasks', async () => {
    const fetcher = response('{"seeded":true}');
    const tasks = [{ title: 'test', category: 'general', estimatedMinutes: 5, recurring: true, frequency: 'daily' }];
    await runStarterSeed(fetcher, tasks);
    expect(fetcher.mock.calls[0][1].body).toBe(JSON.stringify({ tasks }));
  });
});
