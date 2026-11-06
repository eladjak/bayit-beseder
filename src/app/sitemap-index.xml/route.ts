import sitemap from "../sitemap";
import { xmlEscape as x } from "@/lib/blog-xml";
export async function GET() {
  const entries=(await sitemap()).map(item=>`<url><loc>${x(item.url)}</loc>${item.lastModified ? `<lastmod>${new Date(item.lastModified).toISOString()}</lastmod>` : ""}</url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`,{headers:{"Content-Type":"application/xml; charset=utf-8"}});
}
