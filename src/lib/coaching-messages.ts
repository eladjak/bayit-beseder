export type CoachingTrigger =
  | "task_complete"
  | "streak"
  | "golden_rule_hit"
  | "all_daily_done"
  | "emergency"
  | "low_motivation"
  | "partner_complete";

interface CoachingMessage {
  trigger: CoachingTrigger;
  message: string;
  emoji: string;
}

export const COACHING_MESSAGES: CoachingMessage[] = [
  // Task complete
  { trigger: "task_complete", message: "כל הכבוד! עוד משימה הושלמה", emoji: "✅" },
  { trigger: "task_complete", message: "מעולה! ממשיכים ככה", emoji: "💪" },
  { trigger: "task_complete", message: "עוד אחת בכיס! יופי של עבודה", emoji: "🎯" },
  { trigger: "task_complete", message: "הבית אומר תודה!", emoji: "🏠" },
  { trigger: "task_complete", message: "עבודה יפה! כל משימה נחשבת", emoji: "⭐" },
  { trigger: "task_complete", message: "סימנת V! הלאה להבא", emoji: "✨" },
  { trigger: "task_complete", message: "נהדר! הבית נהיה יותר נעים", emoji: "🌟" },
  { trigger: "task_complete", message: "עוד צעד לבית מסודר!", emoji: "👣" },
  { trigger: "task_complete", message: "איזה כיף! משימה ירדה מהרשימה", emoji: "📋" },
  { trigger: "task_complete", message: "בום! עוד משימה עפה", emoji: "💥" },

  // Streak
  { trigger: "streak", message: "אש! ממשיכים ברצף", emoji: "🔥" },
  { trigger: "streak", message: "רצף מרשים! אל תעצרו", emoji: "⚡" },
  { trigger: "streak", message: "וואו, איזה עקביות!", emoji: "🏆" },
  { trigger: "streak", message: "הרצף ממשיך! גאים בכם", emoji: "💫" },
  { trigger: "streak", message: "בלתי ניתנים לעצירה!", emoji: "🚀" },

  // Golden rule hit
  { trigger: "golden_rule_hit", message: "בית בסדר! הגעתם ליעד הזהב", emoji: "🏆" },
  { trigger: "golden_rule_hit", message: "80% ומעלה! הבית זוהר", emoji: "✨" },
  { trigger: "golden_rule_hit", message: "כלל הזהב הושג! מדהימים", emoji: "🥇" },
  { trigger: "golden_rule_hit", message: "יעד הזהב בכיס! כל הכבוד", emoji: "💛" },
  { trigger: "golden_rule_hit", message: "בית בסדר גמור! שיא", emoji: "🌟" },

  // All daily done
  { trigger: "all_daily_done", message: "כל המשימות היומיות הושלמו! יום מושלם", emoji: "🎉" },
  { trigger: "all_daily_done", message: "סיימתם את כל היום! מדהים", emoji: "🏅" },
  { trigger: "all_daily_done", message: "100% ליום! זמן לנוח", emoji: "🎊" },
  { trigger: "all_daily_done", message: "יום מושלם! ראויים להפסקה", emoji: "☕" },
  { trigger: "all_daily_done", message: "כל הV-ים סומנו! יום נהדר", emoji: "✅" },

  // Emergency
  { trigger: "emergency", message: "נשימה עמוקה. מתמקדים רק בחשוב", emoji: "🫂" },
  { trigger: "emergency", message: "תקופה קשה? בסדר. רק הבסיס", emoji: "💙" },
  { trigger: "emergency", message: "מצב חירום = פחות לחץ, יותר חמלה", emoji: "🌊" },
  { trigger: "emergency", message: "גם צעדים קטנים נחשבים עכשיו", emoji: "🐢" },
  { trigger: "emergency", message: "הבית יחכה. אתם קודם", emoji: "💝" },

  // Low motivation
  { trigger: "low_motivation", message: "גם צעד קטן נחשב!", emoji: "👣" },
  { trigger: "low_motivation", message: "התחלה היא החצי! בואו נתחיל באחת", emoji: "🌱" },
  { trigger: "low_motivation", message: "5 דקות זה כל מה שצריך", emoji: "⏱️" },
  { trigger: "low_motivation", message: "לא חייבים מושלם, חייבים להתחיל", emoji: "💪" },
  { trigger: "low_motivation", message: "משימה אחת קטנה יכולה לשנות את היום", emoji: "🌈" },

  // Partner complete
  { trigger: "partner_complete", message: "השותף/ה סיימ/ה משימה! עבודת צוות", emoji: "🤝" },
  { trigger: "partner_complete", message: "גם הצד השני עובד! ביחד", emoji: "👫" },
  { trigger: "partner_complete", message: "עוד משימה בוצעה! צוות מנצח", emoji: "🏠" },
  { trigger: "partner_complete", message: "ביחד אתם בלתי ניתנים לעצירה!", emoji: "💑" },
  { trigger: "partner_complete", message: "שיתוף פעולה מושלם!", emoji: "🙌" },
];

export function getRandomMessage(trigger: CoachingTrigger): CoachingMessage {
  const messages = COACHING_MESSAGES.filter((m) => m.trigger === trigger);
  return messages[Math.floor(Math.random() * messages.length)];
}
