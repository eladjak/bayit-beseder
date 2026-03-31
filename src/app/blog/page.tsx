import type { Metadata } from "next";
import { getBlogPosts, type SanityPost } from "@/lib/sanity/client";
import { BlogContent } from "./blog-content";

export const metadata: Metadata = {
  title: "בלוג | בית בסדר — טיפים לניהול הבית",
  description:
    "טיפים, מדריכים ורעיונות לניהול בית משותף בצורה חכמה ויעילה. מניקיון ועד חלוקת משימות הוגנת — כל מה שצריך לדעת.",
  alternates: {
    canonical: "https://www.bayitbeseder.com/blog",
    languages: {
      "he-IL": "https://www.bayitbeseder.com/blog",
      "en-US": "https://www.bayitbeseder.com/blog",
    },
  },
  openGraph: {
    title: "בלוג בית בסדר — טיפים לניהול הבית",
    description:
      "מדריכים, שיטות ורעיונות שיעזרו לכם לנהל את הבית ביחד — בלי ויכוחים, בלי עומס.",
    url: "https://www.bayitbeseder.com/blog",
    siteName: "בית בסדר",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "https://www.bayitbeseder.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "בית בסדר — ניהול בית משותף",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "בלוג בית בסדר — טיפים לניהול הבית",
    description:
      "מדריכים, שיטות ורעיונות שיעזרו לכם לנהל את הבית ביחד — בלי ויכוחים, בלי עומס.",
    images: ["https://www.bayitbeseder.com/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "בלוג בית בסדר",
  description:
    "טיפים, מדריכים ורעיונות לניהול בית משותף בצורה חכמה ויעילה.",
  url: "https://www.bayitbeseder.com/blog",
  publisher: {
    "@type": "Organization",
    name: "בית בסדר",
    url: "https://www.bayitbeseder.com",
  },
  blogPost: [
    {
      "@type": "BlogPosting",
      headline: "איך לתכנן שבוע של ניקיון ב-10 דקות",
      description:
        "תכנון שבועי חוסך שעות של ויכוחים ומבטיח שהכל ייעשה. הנה השיטה שעובדת.",
      datePublished: "2026-01-10",
      author: { "@type": "Organization", name: "בית בסדר" },
      image: "https://www.bayitbeseder.com/og-image.png",
      url: "https://www.bayitbeseder.com/blog#weekly-planning",
    },
    {
      "@type": "BlogPosting",
      headline: "10 טריקים לניקוי שיחסכו לכם זמן",
      description:
        "טריקים פשוטים שהופכים ניקוי ממשימה מעצבנת לדבר שנגמר מהר.",
      datePublished: "2026-01-17",
      author: { "@type": "Organization", name: "בית בסדר" },
      image: "https://www.bayitbeseder.com/og-image.png",
      url: "https://www.bayitbeseder.com/blog#cleaning-hacks",
    },
    {
      "@type": "BlogPosting",
      headline: "חלוקת משימות הוגנת — בלי ויכוחים",
      description:
        "השיטה שמונעת את ה'אני תמיד עושה הכל' ושומרת על שלום בית.",
      datePublished: "2026-01-24",
      author: { "@type": "Organization", name: "בית בסדר" },
      image: "https://www.bayitbeseder.com/og-image.png",
      url: "https://www.bayitbeseder.com/blog#fair-division",
    },
    {
      "@type": "BlogPosting",
      headline: "איך לשמור על מוטיבציה לניקיון",
      description:
        "הסוד הוא לא לאהוב לנקות — הסוד הוא לבנות הרגלים שעובדים גם בימים עייפים.",
      datePublished: "2026-02-03",
      author: { "@type": "Organization", name: "בית בסדר" },
      image: "https://www.bayitbeseder.com/og-image.png",
      url: "https://www.bayitbeseder.com/blog#motivation",
    },
    {
      "@type": "BlogPosting",
      headline: "שיטת האזורים: לנקות חכם, לא קשה",
      description:
        "במקום לחשוב על משימות בודדות, חשבו על אזורים. יום ראשון = מטבח, יום שלישי = סלון.",
      datePublished: "2026-02-14",
      author: { "@type": "Organization", name: "בית בסדר" },
      image: "https://www.bayitbeseder.com/og-image.png",
      url: "https://www.bayitbeseder.com/blog#zones",
    },
    {
      "@type": "BlogPosting",
      headline: "ניקוי מהיר לפני אורחים — 15 דקות",
      description:
        "אורחים בדרך? הנה מה לעשות ב-15 דקות כדי שהבית ייראה מושלם.",
      datePublished: "2026-02-22",
      author: { "@type": "Organization", name: "בית בסדר" },
      image: "https://www.bayitbeseder.com/og-image.png",
      url: "https://www.bayitbeseder.com/blog#quick-clean",
    },
  ],
};

export default async function BlogPage() {
  const sanityPosts = await getBlogPosts();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogContent sanityPosts={sanityPosts} />
    </>
  );
}
