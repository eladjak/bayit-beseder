import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider, ThemeScript } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "בית בסדר - ניהול תחזוקת הבית",
    template: "%s | בית בסדר",
  },
  description:
    "אפליקציה חינמית בעברית לניהול תחזוקת הבית לזוגות ומשפחות — תכנון שבועי חכם, גיימיפיקציה, רשימת קניות משותפת, Google Calendar ו-WhatsApp",
  keywords: [
    "ניהול הבית",
    "תחזוקת הבית",
    "משימות בית",
    "זוגות",
    "משפחה",
    "תכנון שבועי",
    "רשימת קניות",
    "גיימיפיקציה",
    "אפליקציה עברית",
    "בית בסדר",
    "bayit beseder",
    "home management",
    "household chores",
  ],
  metadataBase: new URL("https://www.bayitbeseder.com"),
  alternates: {
    canonical: "https://www.bayitbeseder.com",
    languages: {
      "he-IL": "https://www.bayitbeseder.com",
      "en-US": "https://www.bayitbeseder.com",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "X9pkJAZuvtfG0-NomU_6uv9i47aG2_apJjFAzUFle9A",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "בית בסדר",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "בית בסדר — ניהול הבית ביחד, בכיף",
    description:
      "אפליקציה חינמית בעברית לניהול הבית לזוגות ומשפחות. משימות עם גיימיפיקציה, תכנון שבועי חכם, רשימת קניות משותפת ופרסים!",
    url: "https://www.bayitbeseder.com",
    siteName: "בית בסדר",
    images: [
      {
        url: "https://www.bayitbeseder.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "בית בסדר — אפליקציה לניהול הבית לזוגות",
      },
    ],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "בית בסדר — ניהול הבית ביחד, בכיף",
    description:
      "אפליקציה חינמית בעברית לניהול הבית לזוגות ומשפחות. משימות עם גיימיפיקציה, תכנון שבועי חכם, רשימת קניות משותפת ופרסים!",
    images: ["https://www.bayitbeseder.com/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <ThemeScript />
        {/* Preconnect to Google Fonts to reduce font loading latency */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {process.env.NODE_ENV === "production" && (
          <script
            defer
            data-domain="bayitbeseder.com"
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body className={`${heebo.variable} font-sans antialiased`}>
        <ThemeProvider>
          <LanguageProvider>
          {children}
          </LanguageProvider>
          <Toaster
            position="top-center"
            dir="rtl"
            toastOptions={{
              className: "font-sans",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
