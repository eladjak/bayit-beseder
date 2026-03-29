export interface Achievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  category: "streak" | "completion" | "special" | "collaboration" | "mastery" | "milestone";
  points: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Completion basics ──────────────────────────────────────────────
  {
    code: "first_task",
    title: "צעד ראשון",
    description: "השלמת משימה ראשונה",
    icon: "👶",
    threshold: 1,
    category: "completion",
    points: 10,
  },
  {
    code: "all_daily_10",
    title: "עשר פעמים מושלם",
    description: "סיימת את כל המשימות היומיות 10 פעמים",
    icon: "💯",
    threshold: 10,
    category: "completion",
    points: 50,
  },
  {
    code: "golden_rule_5",
    title: "חמש פעמים זהב",
    description: "הגעת ליעד הזהב 5 פעמים",
    icon: "🥇",
    threshold: 5,
    category: "completion",
    points: 40,
  },

  // ── Streak ─────────────────────────────────────────────────────────
  {
    code: "streak_3",
    title: "שלושה ברצף",
    description: "רצף של 3 ימים רצופים",
    icon: "🔥",
    threshold: 3,
    category: "streak",
    points: 20,
  },
  {
    code: "streak_7",
    title: "שבוע מושלם",
    description: "רצף של שבוע שלם",
    icon: "⭐",
    threshold: 7,
    category: "streak",
    points: 50,
  },
  {
    code: "streak_30",
    title: "חודש ברצף",
    description: "רצף של 30 ימים!",
    icon: "🏆",
    threshold: 30,
    category: "streak",
    points: 200,
  },

  // ── Consistency (new) ──────────────────────────────────────────────
  {
    code: "early_bird",
    title: "מוקדם/ת",
    description: "השלמת 5 משימות לפני 09:00",
    icon: "🐦",
    threshold: 5,
    category: "streak",
    points: 30,
  },
  {
    code: "night_owl",
    title: "לילה טוב",
    description: "השלמת משימות אחרי 22:00 שלוש פעמים",
    icon: "🦉",
    threshold: 3,
    category: "streak",
    points: 30,
  },

  // ── Collaboration (new) ────────────────────────────────────────────
  {
    code: "clean_team",
    title: "צוות נקי",
    description: "שניכם סיימתם את כל המשימות באותו יום 5 פעמים",
    icon: "🤝",
    threshold: 5,
    category: "collaboration",
    points: 80,
  },
  {
    code: "true_partners",
    title: "שותפים אמיתיים",
    description: "שני חברי הבית השלימו משימות באותו יום 5 פעמים",
    icon: "💑",
    threshold: 5,
    category: "collaboration",
    points: 60,
  },
  {
    code: "leader",
    title: "מנהיג/ה",
    description: "היית המשלים/ה הראשי/ת במשך שבוע שלם",
    icon: "👑",
    threshold: 1,
    category: "collaboration",
    points: 70,
  },
  {
    code: "balancer",
    title: "מאזן/ת",
    description: "ציון הזהב שלך עלה על 90% במשך שבוע",
    icon: "⚖️",
    threshold: 1,
    category: "collaboration",
    points: 90,
  },
  {
    code: "helper",
    title: "יד ימין",
    description: "סיימת 10 משימות של השותף/ה",
    icon: "🫱🏻‍🫲🏽",
    threshold: 10,
    category: "collaboration",
    points: 50,
  },

  // ── Category mastery (new) ─────────────────────────────────────────
  {
    code: "chef",
    title: "שף/ית",
    description: "השלמת 20 משימות מטבח",
    icon: "👨‍🍳",
    threshold: 20,
    category: "mastery",
    points: 60,
  },
  {
    code: "kitchen_master",
    title: "מלך/ת המטבח",
    description: "50 משימות מטבח הושלמו",
    icon: "🍳",
    threshold: 50,
    category: "mastery",
    points: 120,
  },
  {
    code: "clean_plus",
    title: "ניקיון+",
    description: "השלמת 20 משימות אמבטיה",
    icon: "🚿",
    threshold: 20,
    category: "mastery",
    points: 60,
  },
  {
    code: "gardener",
    title: "גנן/ית",
    description: "השלמת 10 משימות חוץ",
    icon: "🌿",
    threshold: 10,
    category: "mastery",
    points: 40,
  },

  // ── Milestones (new) ───────────────────────────────────────────────
  {
    code: "century",
    title: "100 משימות",
    description: "השלמת 100 משימות בסך הכל",
    icon: "💪",
    threshold: 100,
    category: "milestone",
    points: 100,
  },
  {
    code: "quarter_millennium",
    title: "250 משימות",
    description: "השלמת 250 משימות בסך הכל",
    icon: "🚀",
    threshold: 250,
    category: "milestone",
    points: 250,
  },
  {
    code: "half_year",
    title: "חצי שנה",
    description: "השתמשת באפליקציה 6 חודשים",
    icon: "🗓️",
    threshold: 180,
    category: "milestone",
    points: 300,
  },

  // ── Special ────────────────────────────────────────────────────────
  {
    code: "emergency_survivor",
    title: "שורדי חירום",
    description: "עברתם שבוע שלם במצב חירום",
    icon: "🛡️",
    threshold: 7,
    category: "special",
    points: 100,
  },
  {
    code: "weekly_sync_4",
    title: "מתואמים",
    description: "4 סנכרונים שבועיים ברצף",
    icon: "📅",
    threshold: 4,
    category: "special",
    points: 60,
  },
  {
    code: "speed_demon",
    title: "בזק",
    description: "סיימת משימה תוך פחות מ-5 דקות",
    icon: "⚡",
    threshold: 1,
    category: "special",
    points: 20,
  },
  {
    code: "perfectionist",
    title: "פרפקציוניסט/ית",
    description: "דירגת 5 כוכבים 20 פעמים",
    icon: "💎",
    threshold: 20,
    category: "special",
    points: 80,
  },
];
