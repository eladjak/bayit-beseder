export interface PlaylistTask {
  title: string;
  durationSeconds: number;
}

export interface Playlist {
  id: string;
  name: string;
  icon: string;
  totalMinutes: number;
  tasks: PlaylistTask[];
}

export const PLAYLISTS: Playlist[] = [
  {
    id: "morning-kitchen",
    name: "שגרת בוקר מטבח",
    icon: "☀️",
    totalMinutes: 10,
    tasks: [
      { title: "שטיפת כלים", durationSeconds: 180 },
      { title: "ניגוב משטחים", durationSeconds: 90 },
      { title: "סידור שולחן", durationSeconds: 60 },
      { title: "פינוי זבל", durationSeconds: 60 },
    ],
  },
  {
    id: "evening-living",
    name: "שגרת ערב סלון",
    icon: "🛋️",
    totalMinutes: 8,
    tasks: [
      { title: "סידור כריות", durationSeconds: 60 },
      { title: "ניקוי שולחן", durationSeconds: 90 },
      { title: "שאיבת אבק", durationSeconds: 150 },
      { title: "סידור שלט ומגזינים", durationSeconds: 60 },
    ],
  },
  {
    id: "bathroom",
    name: "שגרת חדר אמבטיה",
    icon: "🚿",
    totalMinutes: 12,
    tasks: [
      { title: "ניקוי כיור", durationSeconds: 120 },
      { title: "ניקוי אסלה", durationSeconds: 150 },
      { title: "ניגוב מראה", durationSeconds: 60 },
      { title: "סידור מגבות", durationSeconds: 60 },
      { title: "ניקוי רצפה", durationSeconds: 120 },
    ],
  },
  {
    id: "bedroom",
    name: "שגרת חדר שינה",
    icon: "🛏️",
    totalMinutes: 7,
    tasks: [
      { title: "הצעת מיטה", durationSeconds: 120 },
      { title: "סידור שידה", durationSeconds: 60 },
      { title: "אוורור חדר", durationSeconds: 60 },
      { title: "קיפול בגדים", durationSeconds: 180 },
    ],
  },
  {
    id: "quick-guests",
    name: "ניקיון מהיר לפני אורחים",
    icon: "🏠",
    totalMinutes: 15,
    tasks: [
      { title: "סידור סלון", durationSeconds: 180 },
      { title: "ניקוי שירותים", durationSeconds: 120 },
      { title: "מטבח מסודר", durationSeconds: 150 },
      { title: "כניסה נקייה", durationSeconds: 90 },
      { title: "ריח טוב", durationSeconds: 60 },
    ],
  },
  {
    id: "friday-routine",
    name: "שגרת שישי",
    icon: "✨",
    totalMinutes: 20,
    tasks: [
      { title: "שאיבת כל הבית", durationSeconds: 300 },
      { title: "שטיפת רצפות", durationSeconds: 300 },
      { title: "החלפת מגבות", durationSeconds: 120 },
      { title: "סידור שולחן שבת", durationSeconds: 180 },
    ],
  },
];
