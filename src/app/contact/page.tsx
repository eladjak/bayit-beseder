import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "צור קשר",
  description: "צרו קשר עם הצוות של בית בסדר — ברוכים הבאים לכל שאלה, רעיון או דיווח על באג.",
};

const contacts = [
  {
    icon: "✉️",
    title: "אימייל",
    description: "לכל שאלה או הצעה",
    href: "mailto:eladjak@gmail.com",
    label: "eladjak@gmail.com",
    cta: "שלחו הודעה",
    gradient: "from-indigo-500 to-violet-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    border: "border-indigo-100 dark:border-indigo-900/40",
  },
  {
    icon: "💬",
    title: "וואטסאפ",
    description: "לשיחה מהירה",
    href: "https://wa.me/972",
    label: "פתחו שיחה",
    cta: "כתבו לנו",
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-100 dark:border-emerald-900/40",
  },
  {
    icon: "🐛",
    title: "GitHub",
    description: "לבאגים ובקשות פיצ'רים",
    href: "https://github.com/eladjak/bayit-beseder",
    label: "eladjak/bayit-beseder",
    cta: "פתחו Issue",
    gradient: "from-gray-700 to-gray-900",
    bg: "bg-gray-50 dark:bg-gray-900/30",
    border: "border-gray-200 dark:border-gray-800/40",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-dvh bg-background" dir="rtl" lang="he">

      {/* Hero — compact gradient strip */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 85%, rgba(255,255,255,0.2) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(255,255,255,0.1) 0%, transparent 40%)",
          }}
        />
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-14 text-center text-white">
          <div className="text-5xl mb-4">🏠</div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            צור קשר
          </h1>
          <p className="text-white/75 text-base leading-relaxed max-w-md mx-auto">
            יש לכם שאלה, רעיון, או מצאתם באג? נשמח לשמוע מכם!
          </p>
        </div>
      </section>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-6 py-12">

        {/* Story card */}
        <div className="card-elevated p-6 mb-10 flex gap-4 items-start">
          <span className="text-3xl flex-shrink-0 mt-0.5">😄</span>
          <p className="text-foreground/80 leading-relaxed text-sm md:text-base">
            אנחנו זוג שבנה את האפליקציה הזו כי נמאס לנו מוויכוחים על מי עושה
            יותר בבית. אם גם אתם מכירים את זה — ברוכים הבאים! נשמח לשמוע
            מכם, בין אם זה תגובה, רעיון או סתם &quot;תודה&quot; 🙏
          </p>
        </div>

        {/* Contact cards */}
        <div className="flex flex-col gap-4 mb-12">
          {contacts.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target={c.href.startsWith("mailto") ? undefined : "_blank"}
              rel={c.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
              className={`card-elevated p-5 flex items-center gap-4 transition-transform hover:-translate-y-0.5 active:translate-y-0 group ${c.border} border`}
            >
              {/* Icon bubble */}
              <div
                className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center text-2xl flex-shrink-0`}
              >
                {c.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground text-base leading-tight">
                  {c.title}
                </div>
                <div className="text-muted text-xs mt-0.5">{c.description}</div>
                <div className="text-muted text-xs mt-1 truncate font-mono">
                  {c.label}
                </div>
              </div>

              {/* CTA chip */}
              <span
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-l ${c.gradient} text-white text-xs font-semibold shadow-sm group-hover:shadow-md transition-shadow`}
              >
                {c.cta}
              </span>
            </a>
          ))}
        </div>

        {/* Back home link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            ← חזרה לדף הבית
          </Link>
        </div>
      </main>
    </div>
  );
}
