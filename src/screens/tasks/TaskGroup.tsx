import type { ReactNode } from 'react';
export function TaskGroup({ title, children, folded = false }: { title:string; children:ReactNode; folded?:boolean }) {
 return folded ? <details className="mt-6"><summary className="min-h-11 cursor-pointer py-2 text-lg font-bold">{title}</summary><ul>{children}</ul></details> : <section className="mt-6"><h2 className="text-lg font-bold">{title}</h2><ul>{children}</ul></section>;
}
