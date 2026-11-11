'use client';
import { useId, useRef, useState } from 'react';
import { useShoppingAdd } from './useShoppingAdd';

export function ShoppingAdd({ locale, onAdd }: { locale: string; onAdd: (title: string) => Promise<{ok: boolean}> }) {
 const he = locale === 'he'; const model = useShoppingAdd(locale); const id = useId();
 const [saving, setSaving] = useState(false); const [message, setMessage] = useState(''); const inFlight = useRef(false);
 async function add(value: string) {
  const title = value.trim(); if (!title || inFlight.current) return;
  inFlight.current = true; setSaving(true); setMessage('');
  try { const result = await onAdd(title); if (result.ok) { model.change(''); setMessage(he ? 'נוסף לרשימה' : 'Added to the list'); } else setMessage(he ? 'לא הצלחנו להוסיף. נסו שוב.' : 'Could not add the item. Try again.'); }
  catch { setMessage(he ? 'לא הצלחנו להוסיף. נסו שוב.' : 'Could not add the item. Try again.'); }
  finally { inFlight.current = false; setSaving(false); }
 }
 return <form onSubmit={event => { event.preventDefault(); void add(model.active >= 0 && model.suggestions[model.active] ? model.label(model.suggestions[model.active]) : model.text); }}>
  <label htmlFor={id} className="block font-semibold">{he ? 'הוספת פריט' : 'Add item'}</label>
  <div className="relative flex gap-2"><div className="min-w-0 flex-1"><input id={id} role="combobox" aria-autocomplete="list" aria-expanded={model.suggestions.length > 0} aria-controls={`${id}-list`} aria-activedescendant={model.active >= 0 ? `${id}-${model.active}` : undefined} autoComplete="off" value={model.text} placeholder={he ? 'למשל חלב' : 'For example, milk'} onChange={event => model.change(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && model.active >= 0) { event.preventDefault(); void add(model.label(model.suggestions[model.active])); } else if (event.key === 'ArrowDown' && model.suggestions.length) { event.preventDefault(); model.setActive((model.active + 1) % model.suggestions.length); } else if (event.key === 'ArrowUp' && model.suggestions.length) { event.preventDefault(); model.setActive((model.active + model.suggestions.length - 1) % model.suggestions.length); } else if (event.key === 'Escape') { model.setClosed(true); model.setActive(-1); } }} className="min-h-12 w-full rounded-bb-md border border-bb-line-strong bg-bb-card px-3 focus-visible:outline-2 focus-visible:outline-bb-primary" />
  {model.suggestions.length > 0 && <ul id={`${id}-list`} role="listbox" className="absolute z-10 max-h-64 w-full overflow-auto rounded-bb-md bg-bb-card shadow-bb-2">{model.suggestions.map((item, index) => <li id={`${id}-${index}`} key={`${item.name}-${index}`} role="option" aria-selected={model.active === index} onMouseDown={event => event.preventDefault()} onClick={() => void add(model.label(item))} className="flex min-h-11 cursor-pointer items-center px-4 hover:bg-bb-card-hover aria-selected:bg-bb-primary-50">{model.label(item)}</li>)}</ul>}</div><button type="submit" disabled={saving || !model.text.trim()} className="min-h-12 rounded-bb-md bg-bb-primary px-4 font-semibold text-bb-on-primary hover:bg-bb-primary-hover focus-visible:outline-2 focus-visible:outline-bb-primary disabled:opacity-50">{he ? 'הוספה' : 'Add'}</button></div>
  <p role="status" className="text-bb-sm">{message}</p>
 </form>;
}
