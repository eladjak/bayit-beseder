import type { CopyFragment } from './types';

const moreCopy = {
  he: {
    title: 'עוד בבית', intro: 'כלים ורעיונות לבית, כשצריכים אותם.',
    emergency: 'יום עמוס', emergencyDesc: 'מתמקדים במה שחשוב עכשיו.',
    planning: 'תכנון', weekly: 'השבוע', weeklyDesc: 'מתכננים יחד את השבוע הקרוב.',
    history: 'היסטוריה', historyDesc: 'רואים מה כבר עשינו בבית.', stats: 'סטטיסטיקה', statsDesc: 'רואים את ההתקדמות שלנו בבית.', print: 'הדפסה', printDesc: 'מדפיסים את רשימת המשימות.',
    home: 'בבית', tools: 'כלי הבית', toolsDesc: 'מילה טובה, הפתעות וגלגל המזל.', playlists: 'פלייליסטים לניקיון', playlistsDesc: 'רשימת צעדים קצרה עם טיימר.',
    account: 'חשבון', settings: 'הגדרות', settingsDesc: 'מנהלים את הבית ואת החשבון.', shortcuts: 'קיצורי דרך', shortcutsDesc: 'מגלים איך להגיע מהר לפעולות.',
    reading: 'קריאה', blog: 'הבלוג', blogDesc: 'קוראים רעיונות וטיפים לבית.',
  },
  en: {
    title: 'More at home', intro: 'Tools and ideas for home, whenever you need them.',
    emergency: 'Busy day', emergencyDesc: 'Focus on what matters right now.',
    planning: 'Planning', weekly: 'This week', weeklyDesc: 'Plan the coming week together.',
    history: 'History', historyDesc: 'See what you have already done at home.', stats: 'Statistics', statsDesc: 'See your progress at home.', print: 'Print', printDesc: 'Print your task list.',
    home: 'At home', tools: 'Household tools', toolsDesc: 'Appreciation, surprises and the wheel.', playlists: 'Cleaning playlists', playlistsDesc: 'Short lists of steps with a timer.',
    account: 'Account', settings: 'Settings', settingsDesc: 'Manage your home and account.', shortcuts: 'Shortcuts', shortcutsDesc: 'Find quicker ways to get things done.',
    reading: 'Reading', blog: 'The blog', blogDesc: 'Read ideas and tips for your home.',
  },
} satisfies CopyFragment;
export default moreCopy;
