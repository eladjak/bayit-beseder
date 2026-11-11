'use client';
import { useSyncExternalStore } from 'react';

const KEY = 'bayit-beseder-emergency-mode';
const EVENT = 'bayit-busy-day-change';
export function readBusyDay() { try { return localStorage.getItem(KEY) === 'true'; } catch { return false; } }
function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', callback);
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener('storage', callback); };
}
export function useBusyDay() {
  const enabled = useSyncExternalStore(subscribe, readBusyDay, () => false);
  const setEnabled = (value: boolean) => { try { localStorage.setItem(KEY, String(value)); window.dispatchEvent(new Event(EVENT)); } catch { /* Storage unavailable. */ } };
  return { enabled, setEnabled };
}
