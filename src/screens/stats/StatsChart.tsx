'use client';
export function StatsChart({title, items}: {title:string;items:{label:string;value:number}[]}) {
 const max = Math.max(1,...items.map(i=>i.value));
 return <section className="rounded-bb-md bg-bb-card p-5 shadow-bb-1"><h2 className="text-bb-lg font-bold">{title}</h2><ul className="mt-4 space-y-3">{items.map(item=><li key={item.label}><div className="flex justify-between gap-3"><span>{item.label}</span><span className="tabular-nums">{item.value}</span></div><div aria-hidden="true" className="mt-1 h-2 rounded-full bg-bb-primary-50"><div className="h-full rounded-full bg-bb-primary" style={{width:`${item.value/max*100}%`}} /></div></li>)}</ul></section>;
}
