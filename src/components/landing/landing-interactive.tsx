"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useMotionValue, animate, AnimatePresence } from "framer-motion";

/* ── Animated counter ─────────────────────────────────────────── */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, {
      duration: 1.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [inView, to, mv]);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4 }}
    >
      {display}
      {suffix}
    </motion.span>
  );
}

/* ── Social Proof / Stats Bar ─────────────────────────────────── */
export function SocialProofSection() {
  const stats = [
    { value: 340, suffix: "+", label: "זוגות ומשפחות" },
    { value: 12800, suffix: "+", label: "משימות הושלמו" },
    { value: 98, suffix: "%", label: "ממליצים לחברים" },
  ];

  return (
    <section className="relative overflow-hidden py-14">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, #6366F1 0%, transparent 70%)",
        }}
      />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-xs font-semibold tracking-widest text-primary/70 uppercase mb-3"
        >
          בית בסדר במספרים
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: -8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-2xl md:text-3xl font-extrabold text-foreground mb-10"
        >
          כבר{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #6366F1, #8B5CF6, #D946EF)",
            }}
          >
            מאות בתים
          </span>{" "}
          מנוהלים בשקט
        </motion.h2>

        <div className="grid grid-cols-3 gap-4 md:gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="bg-surface border border-border rounded-2xl p-5 shadow-sm"
            >
              <div
                className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent mb-1"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #6366F1, #8B5CF6)",
                }}
              >
                <CountUp to={s.value} suffix={s.suffix} />
              </div>
              <p className="text-xs md:text-sm text-muted font-medium">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-xs text-muted/60 mt-6"
        >
          * נתונים מתעדכנים מדי שבוע
        </motion.p>
      </div>
    </section>
  );
}

/* ── Testimonials ─────────────────────────────────────────────── */
const testimonials = [
  {
    quote:
      "סוף סוף אין ויכוחים על מי עשה מה. כל אחד רואה בדיוק מה הוא חייב לעשות — ואפילו מתחרים ביניהם מי יגמור קודם 😂",
    name: "שירה ואיתן",
    location: "תל אביב",
    avatar: "שא",
  },
  {
    quote:
      "הייתי סקפטית בהתחלה, אבל אחרי שבוע אחד הבן אדם שלי גם שוטף כלים וגם מתלהב מהנקודות שלו. אני לא מאמינה שזה קרה.",
    name: "מיכל כ.",
    location: "חיפה",
    avatar: "מכ",
  },
  {
    quote:
      "רשימת הקניות המשותפת לבד שווה את זה. אנחנו מעדכנים בוואטסאפ וזה מסונכרן ישר לאפליקציה. חסך לנו עשרות שיחות מיותרות.",
    name: "דן ולאה",
    location: "ירושלים",
    avatar: "דל",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-surface border-y border-border py-16">
      <div className="max-w-5xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: -8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-center text-foreground mb-2"
        >
          מה אומרים עלינו?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-center text-muted text-sm mb-10"
        >
          (לא, לא בדינו את זה — זה אמיתי 😄)
        </motion.p>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.13 }}
              className="bg-background border border-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Stars */}
              <div className="flex gap-0.5 text-amber-400 text-sm">
                {"★★★★★".split("").map((s, idx) => (
                  <span key={idx}>{s}</span>
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-foreground/80 leading-relaxed flex-1">
                &quot;{t.quote}&quot;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted">{t.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ Accordion ────────────────────────────────────────────── */
const faqs = [
  {
    q: "האם האפליקציה בחינם לגמרי?",
    a: "כן, בית בסדר חינמית לחלוטין. אין תשלום, אין מנוי, אין תכונות פרימיום נסתרות. פשוט נרשמים ומתחילים.",
  },
  {
    q: "האם צריך להוריד אפליקציה מהחנות?",
    a: "לא! בית בסדר עובדת ישר מהדפדפן. אפשר גם להוסיף לדף הבית (PWA) ולקבל חוויה כמו אפליקציה אמיתית — בלי להוריד כלום.",
  },
  {
    q: "איך עובד שיתוף הבית עם הפרטנר/ית?",
    a: "אחרי ההרשמה שולחים הזמנה בוואטסאפ בלחיצה אחת. כשהפרטנר/ית מצטרף/ת — הכל מסונכרן בזמן אמת: משימות, קניות, נקודות.",
  },
  {
    q: "מה עם פרטיות? המידע שלנו בטוח?",
    a: "המידע שלכם מאובטח ב-Supabase עם הצפנה מלאה. אנחנו לא מוכרים מידע ולא מפרסמים. רק אתם ושותפכם רואים את הנתונים.",
  },
  {
    q: "האם זה עובד גם למשפחות עם ילדים (לא רק זוגות)?",
    a: "כרגע האפליקציה מותאמת לשני משתמשים — אך אנחנו עובדים על תמיכה מלאה במשפחות גדולות עם ילדים. רישום עכשיו מבטיח לכם מקום בגרסה הבאה!",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="max-w-3xl mx-auto px-6 py-16">
      <motion.h2
        initial={{ opacity: 0, y: -8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-2xl font-bold text-center text-foreground mb-2"
      >
        שאלות נפוצות
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.12 }}
        className="text-center text-muted text-sm mb-10"
      >
        כל מה שרציתם לדעת ולא העזתם לשאול
      </motion.p>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-right text-foreground font-semibold text-sm hover:bg-surface-hover transition-colors"
            >
              <span>{faq.q}</span>
              <motion.span
                animate={{ rotate: open === i ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="text-primary text-lg flex-shrink-0 me-2"
              >
                ▾
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm text-muted leading-relaxed">
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── Floating CTA ─────────────────────────────────────────────── */
export function FloatingCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-section");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-6 left-1/2 z-50"
          style={{ transform: "translateX(-50%)" }}
        >
          <Link
            href="/login"
            className="flex items-center gap-2 px-7 py-3.5 rounded-full text-white font-bold text-base shadow-2xl hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95"
            style={{
              background:
                "linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #D946EF 100%)",
              boxShadow:
                "0 8px 32px rgba(99,102,241,0.4), 0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            🚀 התחילו בחינם
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
