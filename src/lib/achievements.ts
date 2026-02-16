export interface Achievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  category: "streak" | "completion" | "special";
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    code: "first_task",
    title: "צעד ראשון",
    description: "השלמת משימה ראשונה",
    icon: "👶",
    threshold: 1,
    category: "completion",
  },
  {
    code: "streak_3",
    title: "שלושה ברצף",
    description: "רצף של 3 ימים רצופים",
    icon: "🔥",
    threshold: 3,
    category: "streak",
  },
  {
    code: "streak_7",
    title: "שבוע מושלם",
    description: "רצף של שבוע שלם",
    icon: "⭐",
    threshold: 7,
    category: "streak",
  },
  {
    code: "streak_30",
    title: "חודש של הצלחה",
    description: "רצף של 30 ימים!",
    icon: "🏆",
    threshold: 30,
    category: "streak",
  },
  {
    code: "golden_rule_5",
    title: "חמש פעמים זהב",
    description: "הגעת ליעד הזהב 5 פעמים",
    icon: "🥇",
    threshold: 5,
    category: "completion",
  },
  {
    code: "all_daily_10",
    title: "עשר פעמים מושלם",
    description: "סיימת את כל המשימות היומיות 10 פעמים",
    icon: "💯",
    threshold: 10,
    category: "completion",
  },
  {
    code: "kitchen_master",
    title: "שף/ית הבית",
    description: "50 משימות מטבח הושלמו",
    icon: "👨‍🍳",
    threshold: 50,
    category: "completion",
  },
  {
    code: "clean_team",
    title: "צוות נקי",
    description: "שניכם סיימתם את כל המשימות באותו יום 5 פעמים",
    icon: "🤝",
    threshold: 5,
    category: "special",
  },
  {
    code: "emergency_survivor",
    title: "שורדי חירום",
    description: "עברתם שבוע שלם במצב חירום",
    icon: "🛡️",
    threshold: 7,
    category: "special",
  },
  {
    code: "weekly_sync_4",
    title: "מתואמים",
    description: "4 סנכרונים שבועיים ברצף",
    icon: "📅",
    threshold: 4,
    category: "special",
  },
  {
    code: "speed_demon",
    title: "בזק",
    description: "סיימת משימה תוך פחות מ-5 דקות",
    icon: "⚡",
    threshold: 1,
    category: "special",
  },
  {
    code: "helper",
    title: "יד ימין",
    description: "סיימת 10 משימות של השותף/ה",
    icon: "🫱🏻‍🫲🏽",
    threshold: 10,
    category: "special",
  },
  {
    code: "night_owl",
    title: "ינשוף",
    description: "סיימת 10 משימות אחרי 22:00",
    icon: "🦉",
    threshold: 10,
    category: "special",
  },
  {
    code: "early_bird",
    title: "ציפור מוקדמת",
    description: "סיימת 10 משימות לפני 08:00",
    icon: "🐦",
    threshold: 10,
    category: "special",
  },
  {
    code: "perfectionist",
    title: "פרפקציוניסט/ית",
    description: "דירגת 5 כוכבים 20 פעמים",
    icon: "💎",
    threshold: 20,
    category: "special",
  },
];
