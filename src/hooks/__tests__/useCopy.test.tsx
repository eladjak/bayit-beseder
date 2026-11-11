import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage } from '@/components/LanguageProvider';
import { useCopy } from '../useCopy';
import type { ReactNode } from 'react';

const fragment = { he: { greeting: 'שלום {name}', only: 'רק בעברית', nested: { value: 'כן' } }, en: { greeting: 'Hello {name}', nested: { value: 'Yes' } } };
const wrapper = ({ children }: { children: ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe('useCopy', () => {
  it('uses the active language, interpolates and resolves nested keys with Hebrew fallback', () => {
    const { result } = renderHook(() => ({ ...useCopy(fragment), ...useLanguage() }), { wrapper });
    expect(result.current.c('greeting', { name: 'נועה' })).toBe('שלום נועה');
    act(() => result.current.setLocale('en'));
    expect(result.current.c('greeting', { name: 'Noa' })).toBe('Hello Noa');
    expect(result.current.c('nested.value')).toBe('Yes');
    expect(result.current.c('only')).toBe('רק בעברית');
  });
  it('reports missing keys once and never exposes them in production', () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'development');
    const { result } = renderHook(() => useCopy(fragment), { wrapper });
    expect(result.current.c('missing')).toBe('⟦missing⟧');
    expect(result.current.c('missing')).toBe('⟦missing⟧');
    expect(log).toHaveBeenCalledTimes(1);
    vi.stubEnv('NODE_ENV', 'production');
    expect(result.current.c('another.missing')).toBe('משהו חסר כאן');
  });
});
