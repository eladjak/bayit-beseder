import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  SocialProofSection,
  TestimonialsSection,
  FaqSection,
  FloatingCta,
} from "@/components/landing/landing-interactive";

export const metadata: Metadata = {
  title: "בית בסדר — ניהול הבית ביחד, בכיף",
  description: "אפליקציה חינמית בעברית לניהול משימות הבית לזוגות ומשפחות. תכנון שבועי חכם, גיימיפיקציה, WhatsApp והכל בעברית!",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "בית בסדר",
  url: "https://www.bayitbeseder.com",
  description: "אפליקציה חינמית בעברית לניהול משימות הבית לזוגות ומשפחות",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "ILS" },
  inLanguage: "he",
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background" dir="rtl" lang="he">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section id="hero-section" className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 40%, #D946EF 70%, #EC4899 100%)",
          }}
        />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)",
        }} />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center text-white">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-sm font-medium mb-6 border border-white/20">
            🏠 חינם לחלוטין — בעברית — מותאם לנייד
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 tracking-tight">
            הבית שלכם.
            <br />
            <span className="text-white/90">ביחד. בסדר. בכיף.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
            אפליקציה לניהול הבית לזוגות ומשפחות — משימות עם נקודות,
            תכנון שבועי חכם, רשימת קניות משותפת, ואפילו הכנות לפסח.
            <br />
            <span className="text-white/60 text-base">בלי ויכוחים על &quot;מי עשה יותר&quot; 😉</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/login"
              className="px-8 py-3.5 bg-white text-indigo-700 font-bold rounded-2xl text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95"
            >
              🚀 התחילו בחינם
            </Link>
            <a
              href="#features"
              className="px-6 py-3 bg-white/15 backdrop-blur-sm text-white font-medium rounded-2xl border border-white/20 hover:bg-white/25 transition-colors"
            >
              מה בפנים? ↓
            </a>
          </div>

          <p className="text-xs text-white/50 mt-4">
            לא צריך להוריד מחנות. עובד ישר מהדפדפן.
          </p>

          {/* App mockup */}
          <Image
            src="/illustrations/app-mockup.jpg"
            alt="תצוגת האפליקציה"
            width={320}
            height={640}
            className="mt-8 mx-auto w-64 md:w-80 rounded-2xl shadow-2xl border-2 border-white/10"
          />
        </div>
      </section>

      {/* Social Proof — animated stats counter */}
      <SocialProofSection />

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center text-foreground mb-2">
          למה &quot;בית בסדר&quot;?
        </h2>
        <p className="text-center text-muted text-sm mb-10">
          כי לנהל בית ביחד לא חייב להיות מלחמה 🏳️
        </p>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: "✅", title: "משימות עם גיימיפיקציה", desc: "נקודות, רצפים, הישגים ופרסים. ניקיון הפך לגיים." },
            { icon: "📅", title: "תכנון שבועי חכם", desc: "אלגוריתם שמחלק משימות לפי אזורים בבית, יום ועומס." },
            { icon: "🛒", title: "רשימת קניות משותפת", desc: "22 קטגוריות, סגנון Google Keep, סנכרון בזמן אמת." },
            { icon: "🫓", title: "מצב פסח", desc: "37 משימות ב-4 שלבים, 25 פריטי קניות, ספירה לאחור לליל הסדר." },
            { icon: "📱", title: "WhatsApp + PWA", desc: "סיכום יומי בוואטסאפ, התראות, ועובד כאפליקציה מהנייד." },
            { icon: "🏠", title: "אזורים בבית", desc: "ארגון לפי חדרים — מטבח ביום ראשון, סלון ביום שני." },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-surface border border-border rounded-2xl p-5 hover:shadow-lg transition-shadow"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface border-y border-border py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-xl font-bold text-foreground mb-6">
            איך זה עובד?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-xl">1️⃣</div>
              <h3 className="font-semibold text-foreground mb-1">נרשמים</h3>
              <p className="text-sm text-muted">חשבון Google ותוך שניות אתם בפנים</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-xl">2️⃣</div>
              <h3 className="font-semibold text-foreground mb-1">מזמינים שותף/ה</h3>
              <p className="text-sm text-muted">שליחת הזמנה בוואטסאפ בלחיצה אחת</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-xl">3️⃣</div>
              <h3 className="font-semibold text-foreground mb-1">הבית בסדר!</h3>
              <p className="text-sm text-muted">משימות, נקודות, ועוד קצת שקט בבית 😊</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Visual break */}
      <section className="max-w-4xl mx-auto px-6 py-8">
        <Image
          src="/illustrations/couple-celebration.jpg"
          alt="זוג חוגג בית נקי"
          width={448}
          height={300}
          className="w-full max-w-md mx-auto rounded-2xl shadow-lg"
        />
      </section>

      {/* FAQ */}
      <FaqSection />

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-3">
          מוכנים שהבית יהיה בסדר?
        </h2>
        <p className="text-muted mb-6">
          חינם. בעברית. בלי הורדה. פשוט מתחילים.
        </p>
        <Link
          href="/login"
          className="inline-block px-10 py-4 rounded-2xl text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #6366F1, #8B5CF6, #D946EF)",
          }}
        >
          🏠 בואו נתחיל!
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 text-center text-xs text-muted bg-surface">
        <div className="max-w-4xl mx-auto px-6">
          {/* Brand */}
          <p className="font-bold text-base text-foreground mb-1">🏠 בית בסדר</p>
          <p className="text-muted mb-5">ניהול הבית ביחד, בכיף — חינם לחלוטין</p>

          {/* Links grid */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-xs">
            <Link href="/dashboard" className="text-primary hover:underline">דשבורד</Link>
            <Link href="/login" className="text-primary hover:underline">התחברות</Link>
            <Link href="/tasks" className="text-primary hover:underline">משימות</Link>
            <Link href="/shopping" className="text-primary hover:underline">קניות</Link>
            <Link href="/weekly" className="text-primary hover:underline">שבועי</Link>
            <Link href="/stats" className="text-primary hover:underline">סטטיסטיקות</Link>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-xs">
            <Link href="/privacy" className="text-muted hover:text-foreground hover:underline">מדיניות פרטיות</Link>
            <Link href="/terms" className="text-muted hover:text-foreground hover:underline">תנאי שימוש</Link>
            <Link href="/contact" className="text-muted hover:text-foreground hover:underline">צור קשר</Link>
          </div>

          <p className="text-muted/60">בית בסדר © 2026 — נבנה באהבה בישראל 🇮🇱</p>
        </div>
      </footer>

      {/* Floating CTA — appears on scroll */}
      <FloatingCta />
    </div>
  );
}
