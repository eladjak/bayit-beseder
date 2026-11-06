import { getBlogPosts, uniquePosts } from '@/lib/sanity/client';
import { xmlEscape as x } from '@/lib/blog-xml';
export async function GET() {
  const base='https://www.bayitbeseder.com';
  const items=uniquePosts(await getBlogPosts()).map(p=>`<item><title>${x(p.title)}</title><link>${base}/blog/${x(p.slug.current)}</link><guid>${base}/blog/${x(p.slug.current)}</guid><description>${x(p.excerpt || '')}</description><pubDate>${new Date(p.publishedAt!).toUTCString()}</pubDate></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>בית בסדר</title><link>${base}/blog</link><description>מאמרים לניהול הבית</description>${items}</channel></rss>`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
