import { useMemo, useState } from 'react';
import { searchSuggestions, SHOPPING_SUGGESTIONS } from '@/lib/shopping-autocomplete';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0591-\u05c7]/g, '').toLowerCase().trim();
function nearPrefix(query: string, value: string) {
 const target = normalize(value).slice(0, query.length + 1);
 for (const length of [query.length - 1, query.length, query.length + 1]) {
  const word = target.slice(0, length); let i = 0; let j = 0; let errors = 0;
  while (i < query.length && j < word.length) { if (query[i] === word[j]) { i++; j++; } else { errors++; if (query.length > word.length) i++; else if (query.length < word.length) j++; else { i++; j++; } } }
  if (errors + query.length - i + word.length - j <= 1) return true;
 }
 return false;
}
export function useShoppingAdd(locale: string) {
 const [text, setText] = useState('');
 const [active, setActive] = useState(-1);
 const [closed, setClosed] = useState(false);
 const suggestions = useMemo(() => { const query = normalize(text); if (query.length < 2 || closed) return []; const exact = searchSuggestions(query); if (query.length < 3) return exact; const seen = new Set(exact.map(item => item.name)); return [...exact, ...SHOPPING_SUGGESTIONS.filter(item => !seen.has(item.name) && (nearPrefix(query, item.name) || nearPrefix(query, item.nameEn)))].slice(0, 8); }, [text, closed]);
 const label = (item: (typeof suggestions)[number]) => locale === 'en' && item.nameEn ? item.nameEn : item.name;
 function change(value: string) { setText(value); setActive(-1); setClosed(false); }
 return { text, active, setActive, closed, setClosed, suggestions, label, change };
}
