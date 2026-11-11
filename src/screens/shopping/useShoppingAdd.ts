import { useMemo, useState } from 'react';
import { searchSuggestions } from '@/lib/shopping-autocomplete';

export function useShoppingAdd(locale: string) {
 const [text, setText] = useState('');
 const [active, setActive] = useState(-1);
 const [closed, setClosed] = useState(false);
 const suggestions = useMemo(() => text.trim().length >= 2 && !closed ? searchSuggestions(text) : [], [text, closed]);
 const label = (item: (typeof suggestions)[number]) => locale === 'en' && item.nameEn ? item.nameEn : item.name;
 function change(value: string) { setText(value); setActive(-1); setClosed(false); }
 return { text, active, setActive, closed, setClosed, suggestions, label, change };
}
