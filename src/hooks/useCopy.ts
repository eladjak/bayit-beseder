'use client';

import { useCallback } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import common from '@/lib/i18n/fragments/common';
import type { CopyFragment, CopyFragmentTree } from '@/lib/i18n/fragments/types';

const reported = new WeakMap<CopyFragment, Set<string>>();
function lookup(tree: CopyFragmentTree, key: string): string | undefined {
  let value: string | CopyFragmentTree | undefined = tree;
  for (const part of key.split('.')) {
    if (typeof value !== 'object' || value === null || !Object.hasOwn(value, part)) return undefined;
    value = value[part];
  }
  return typeof value === 'string' ? value : undefined;
}

export function useCopy(fragment: CopyFragment) {
  const { locale } = useLanguage();
  const c = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const value = (locale === 'en' ? lookup(fragment.en, key) : undefined) ?? lookup(fragment.he, key);
    if (value === undefined) {
      let keys = reported.get(fragment);
      if (!keys) { keys = new Set(); reported.set(fragment, keys); }
      if (!keys.has(key)) { keys.add(key); console.warn(`Missing copy: ${key}`); }
      return process.env.NODE_ENV === 'production' ? common.he.fallback : `⟦${key}⟧`;
    }
    return value.replace(/\{([^{}]+)\}/g, (match, name: string) =>
      vars && Object.hasOwn(vars, name) ? String(vars[name]) : match,
    );
  }, [fragment, locale]);
  return { c };
}
