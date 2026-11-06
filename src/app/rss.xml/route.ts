import { syndicatedArticles, xmlEscape as x } from "@/lib/syndicated";
export function GET() {
  const base=process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.bayitbeseder.com";
  const items=syndicatedArticles().map(p=>`<item><title>${x(p.title)}</title><link>${base}/blog/${p.slug}</link><guid>${base}/blog/${p.slug}</guid><description>${x(p.description)}</description><pubDate>${new Date(p.dates.published).toUTCString()}</pubDate></item>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>בית בסדר</title><link>https://www.bayitbeseder.com/blog</link><description>מאמרים לניהול הבית</description>${items}</channel></rss>`,{headers:{"Content-Type":"application/rss+xml; charset=utf-8"}});
}
