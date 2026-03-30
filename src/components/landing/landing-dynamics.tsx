"use client";

/**
 * landing-dynamics.tsx
 *
 * Client-side wrapper that dynamically imports all framer-motion-heavy
 * landing page components. By isolating dynamic() with { ssr: false }
 * inside a Client Component, we keep the main page.tsx as a Server
 * Component while still deferring the heavy JS bundle (~120 KB framer-motion
 * + animation logic) out of the initial page load.
 *
 * This is the correct Next.js App Router pattern for ssr:false dynamic imports.
 */

import dynamic from "next/dynamic";

export const SocialProofSection = dynamic(
  () =>
    import("@/components/landing/landing-interactive").then((m) => ({
      default: m.SocialProofSection,
    })),
  { ssr: false }
);

export const TestimonialsSection = dynamic(
  () =>
    import("@/components/landing/landing-interactive").then((m) => ({
      default: m.TestimonialsSection,
    })),
  { ssr: false }
);

export const FloatingCta = dynamic(
  () =>
    import("@/components/landing/landing-interactive").then((m) => ({
      default: m.FloatingCta,
    })),
  { ssr: false }
);

export const AnimatedFeatureCard = dynamic(
  () =>
    import("@/components/landing/landing-interactive").then((m) => ({
      default: m.AnimatedFeatureCard,
    })),
  { ssr: false }
);

export const AnimatedHowItWorksSection = dynamic(
  () =>
    import("@/components/landing/landing-interactive").then((m) => ({
      default: m.AnimatedHowItWorksSection,
    })),
  { ssr: false }
);

export const PulsingCtaButton = dynamic(
  () =>
    import("@/components/landing/landing-interactive").then((m) => ({
      default: m.PulsingCtaButton,
    })),
  { ssr: false }
);

export const FaqChat = dynamic(
  () =>
    import("@/components/landing/faq-chat").then((m) => ({
      default: m.FaqChat,
    })),
  { ssr: false }
);

export const StickyCta = dynamic(
  () =>
    import("@/components/landing/sticky-cta").then((m) => ({
      default: m.StickyCta,
    })),
  { ssr: false }
);
