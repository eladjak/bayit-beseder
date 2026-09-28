"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, AnimatePresence } from "framer-motion";

/* ── Scroll-animated feature card ─────────────────────────────── */
export function AnimatedFeatureCard({
  icon,
  title,
  desc,
  index,
  image,
}: {
  icon: string;
  title: string;
  desc: string;
  index: number;
  image?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  // Alternate: odd indices come from left, even from right (RTL-aware)
  const xFrom = index % 2 === 0 ? -40 : 40;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: xFrom, y: 20 }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1, ease: "easeOut" }}
      className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
    >
      {image && (
        <div className="relative w-full h-40 overflow-hidden">
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="p-5">
        <div className="text-3xl mb-3">{icon}</div>
        <h3 className="font-bold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ── Animated "How it works" step ─────────────────────────────── */
export function AnimatedHowItWorksSection() {
  const steps = [
    {
      emoji: "1️⃣",
      title: "נרשמים",
      desc: "חשבון Google ותוך שניות אתם בפנים",
    },
    {
      emoji: "2️⃣",
      title: "מזמינים שותף/ה",
      desc: "שליחת הזמנה בוואטסאפ בלחיצה אחת",
    },
    {
      emoji: "3️⃣",
      title: "הבית בסדר!",
      desc: "משימות, נקודות, ועוד קצת שקט בבית 😊",
    },
  ];

  return (
    <section className="bg-surface border-y border-border py-12">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: -8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-xl font-bold text-foreground mb-8"
        >
          איך זה עובד?
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Dotted connector line — desktop only */}
          <div
            className="hidden md:block absolute top-6 inset-x-0 mx-auto h-px border-t-2 border-dashed border-primary/20"
            aria-hidden="true"
            style={{ width: "66%", left: "17%" }}
          />
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: i * 0.13 }}
              className="text-center relative z-10"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-xl ring-4 ring-background">
                {step.emoji}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pulsing hero CTA ─────────────────────────────────────────── */
export function PulsingCtaButton() {
  return (
    <div className="relative inline-flex">
      {/* Pulse ring */}
      <motion.span
        className="absolute inset-0 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.3)" }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <Link
        href="/login"
        className="relative px-8 py-3.5 bg-white text-indigo-700 font-bold rounded-2xl text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95"
      >
        🚀 התחילו בחינם
      </Link>
    </div>
  );
}

/* ── Why It Matters Section (replaced fake stats per Wave-12 compliance) ─── */
export function SocialProofSection() {
  // Wave-12: removed unproven stats per payment provider compliance.
  // Replaced with concrete benefit-driven copy.
  const stats = [
    { value: "🏠", suffix: "", label: "הבית מסודר ביחד" },
    { value: "⚡", suffix: "", label: "פחות ויכוחים" },
    { value: "🇮🇱", suffix: "", label: "100% עברית · בחינם" },
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
          className="text-xs font-semibold tracking-widest text-primary-ink uppercase mb-3"
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
          ניהול הבית{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #6366F1, #8B5CF6, #D946EF)",
            }}
          >
            בלי כאב ראש
          </span>
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
                className="text-4xl md:text-5xl font-extrabold mb-1"
              >
                {s.value}
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
                "linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #9333EA 100%)",
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
