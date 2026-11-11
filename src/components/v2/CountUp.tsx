'use client';
import { useEffect, useRef, useState } from 'react';
export function CountUp({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [frameValue, setFrameValue] = useState({ target: value, visual: value });
  const visual = frameValue.target === value ? frameValue.visual : value;
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (media?.matches || !('IntersectionObserver' in window)) return;
    // Preserve the server-rendered final value if it is already on screen.
    const rect = ref.current?.getBoundingClientRect();
    if (rect && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth) { started.current = true; return; }
    let frame = 0;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || started.current) return;
      started.current = true; observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => { const progress = Math.min((now - start) / 600, 1); setFrameValue({ target: value, visual: progress === 1 ? value : Math.round(value * progress) }); if (progress < 1) frame = requestAnimationFrame(tick); };
      setFrameValue({ target: value, visual: 0 }); frame = requestAnimationFrame(tick);
    });
    if (ref.current) observer.observe(ref.current);
    const reduce = (event: MediaQueryListEvent) => { if (event.matches) { cancelAnimationFrame(frame); observer.disconnect(); started.current = true; setFrameValue({ target: value, visual: value }); } };
    media?.addEventListener('change', reduce);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); media?.removeEventListener('change', reduce); };
  }, [value]);
  return <span ref={ref} className={`tabular-nums ${className}`}><span className="sr-only">{value}</span><span aria-hidden="true">{visual}</span></span>;
}
