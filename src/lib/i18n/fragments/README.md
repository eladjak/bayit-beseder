# Copy fragments

Each area owns its own fragment, with no shared registry or dictionary edits. Add `src/lib/i18n/fragments/<area>.ts` with a default export satisfying `CopyFragment`. Both language trees must have matching keys; nested keys are supported.

```ts
import type { CopyFragment } from './types';
const areaCopy = {
  he: { welcome: 'שלום {name}' },
  en: { welcome: 'Hello {name}' },
} satisfies CopyFragment;
export default areaCopy;
```

In a client component, import that file directly and call `const { c } = useCopy(areaCopy)`, then `c('welcome', { name })`. Missing English falls back to Hebrew. Missing Hebrew is reported once per fragment and key; production shows the common Hebrew fallback.

Run `node scripts/ux/copy-check.mjs` after adding or changing a fragment. It discovers files in this folder and checks matching trees, Hebrew punctuation and English words, and em dashes. The checker has a short explicit allow-list for brand names. Interpolation placeholders are ignored when checking Hebrew for English.
