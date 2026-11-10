import type { CopyFragment } from './types';

const common = {
  he: {
    retry: 'לנסות שוב', cancel: 'ביטול', undo: 'ביטול הפעולה', close: 'סגירה',
    save: 'שמירה', saving: 'שומר...', saved: 'נשמר', notSaved: 'לא נשמר',
    offline: 'אין חיבור', loading: 'טוען...', helpPrefix: 'הסבר:', example: 'דוגמה',
    more: 'עוד', fallback: 'משהו חסר כאן', confirm: 'אישור', back: 'חזרה',
    next: 'המשך', done: 'סיום', edit: 'עריכה', delete: 'מחיקה',
    remove: 'הסרה', add: 'הוספה', search: 'חיפוש', error: 'משהו השתבש',
    required: 'שדה חובה', optional: 'לא חובה',
  },
  en: {
    retry: 'Try again', cancel: 'Cancel', undo: 'Undo', close: 'Close',
    save: 'Save', saving: 'Saving...', saved: 'Saved', notSaved: 'Not saved',
    offline: 'No connection', loading: 'Loading...', helpPrefix: 'Explanation:', example: 'Example',
    more: 'More', fallback: 'Something is missing here', confirm: 'Confirm', back: 'Back',
    next: 'Continue', done: 'Done', edit: 'Edit', delete: 'Delete',
    remove: 'Remove', add: 'Add', search: 'Search', error: 'Something went wrong',
    required: 'Required', optional: 'Optional',
  },
} satisfies CopyFragment;
export default common;
