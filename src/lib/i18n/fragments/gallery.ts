export const galleryNames = ['Button', 'IconButton', 'Card', 'Field', 'QuickAdd', 'Check', 'HelpTip', 'EmptyState', 'Notice', 'Skeleton', 'StepIndicator', 'AvatarChip', 'RoomMark', 'CountUp', 'Sheet', 'Dialog', 'showToast', 'Illustration'] as const;
export const isGalleryAllowed = (environment: string | undefined) => environment !== 'production' && (environment === 'preview' || environment === 'development' || process.env.NODE_ENV === 'development');
export const missingGalleryExports = (exports: object, names: readonly string[]) => Object.keys(exports).filter(name => !names.includes(name));
export const galleryCopy = {
  he: { title: 'גלריית רכיבים', intro: 'דוגמאות למצבים ולפעולות. אפשר לפתוח את החלונות ולנסות את הכפתורים.', action: 'פעולה לדוגמה', field: 'שם המשימה', hint: 'אפשר להקליד שם קצר', error: 'צריך למלא שם', empty: 'עדיין אין משימות', loading: 'טוען', openSheet: 'פתיחת גיליון', openDialog: 'פתיחת חלון', toast: 'הצגת הודעה', saved: 'נשמר', long: 'משימה ארוכה במיוחד שמדגימה כיצד הטקסט נשבר כשיש הרבה מילים בתיאור המשימה המשפחתית' },
  en: { title: 'Component gallery', intro: 'Examples of states and actions. Open the overlays and try the buttons.', action: 'Example action', field: 'Task name', hint: 'Enter a short name', error: 'Enter a name', empty: 'No tasks yet', loading: 'Loading', openSheet: 'Open sheet', openDialog: 'Open dialog', toast: 'Show toast', saved: 'Saved', long: 'A particularly long task that shows how a family task description wraps across several lines' },
} as const;

export default galleryCopy;
