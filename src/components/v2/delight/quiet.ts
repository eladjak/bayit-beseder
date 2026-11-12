const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function parts(date: Date) {
 const p = Object.fromEntries(formatter.formatToParts(date).map(({type,value}) => [type,value]));
 return { day: p.weekday, minutes: Number(p.hour) * 60 + Number(p.minute), date: `${p.year}-${p.month}-${p.day}` };
}
export function isQuiet(date: Date): boolean {
 const {day, minutes} = parts(date);
 return minutes >= 22 * 60 || minutes < 7 * 60 || (day === 'Fri' && minutes >= 15 * 60 + 30) || (day === 'Sat' && minutes < 19 * 60);
}
export function isRecapTime(date: Date): boolean {
 const {day, minutes} = parts(date);
 return (day === 'Fri' && minutes >= 15 * 60 + 30) || day === 'Sat' || (day === 'Sun' && minutes < 12 * 60);
}
export function weekCount(rows: {completed_at: string}[], now: Date): number {
 const {day, date} = parts(now);
 const end = new Date(`${date}T12:00:00Z`);
 const weekday = end.getUTCDay();
 end.setUTCDate(end.getUTCDate() - weekday - (day === 'Sun' ? 1 : 0));
 if (day !== 'Sun') end.setUTCDate(end.getUTCDate() + 6);
 const start = new Date(end); start.setUTCDate(end.getUTCDate() - 6);
 const lo = start.toISOString().slice(0,10), hi = end.toISOString().slice(0,10);
 return rows.filter(row => { const d = new Date(row.completed_at); if (Number.isNaN(d.getTime())) return false; const day = parts(d).date; return day >= lo && day <= hi && d <= now; }).length;
}
export function israelDate(date: Date) { return parts(date).date; }
