import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider, ThemeScript } from "@/components/ThemeProvider";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "בית בסדר - ניהול תחזוקת הבית",
  description:
    "אפליקציה לניהול תחזוקת הבית המשותף לזוגות — תכנון שבועי, גיימיפיקציה, Google Calendar ו-WhatsApp",
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
    title: "בית בסדר - ניהול תחזוקת הבית",
    description:
      "אפליקציה לניהול תחזוקת הבית המשותף לזוגות — תכנון שבועי חכם, גיימיפיקציה, Google Calendar ו-WhatsApp",
    url: "https://www.bayitbeseder.com",
    siteName: "בית בסדר",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "בית בסדר - ניהול תחזוקת הבית",
    description:
      "אפליקציה לניהול תחזוקת הבית המשותף לזוגות — תכנון שבועי חכם, גיימיפיקציה, Google Calendar ו-WhatsApp",
    images: ["/og-image.jpg"],
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
      </head>
      <body className={`${heebo.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
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
