import { Home, CheckSquare, ShoppingCart, UtensilsCrossed, MoreHorizontal } from 'lucide-react';

export const items = [
  { href: '/dashboard', label: 'היום', en: 'Today', key: 'today', icon: Home },
  { href: '/tasks', label: 'משימות', en: 'Tasks', key: 'tasks', icon: CheckSquare },
  { href: '/shopping', label: 'קניות', en: 'Shopping', key: 'shopping', icon: ShoppingCart },
  { href: '/meals', label: 'ארוחות', en: 'Meals', key: 'meals', icon: UtensilsCrossed },
  { href: '/more', label: 'עוד', en: 'More', key: 'more', icon: MoreHorizontal },
];
export const secondary = ['/more', '/weekly', '/stats', '/settings', '/history', '/emergency', '/playlists'];
export function isActive(href: string, pathname: string) {
  return href === '/more' ? secondary.some(path => pathname === path || pathname.startsWith(path + '/')) : pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
}
