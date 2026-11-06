import type { MetadataRoute } from "next";
import { getBlogPosts, uniquePosts } from "@/lib/sanity/client";

// Blog post IDs and their publish dates — keep in sync with blog-content.tsx
const BLOG_POSTS = [
  { id: "weekly-planning", date: "2026-01-10" },
  { id: "cleaning-hacks", date: "2026-01-17" },
  { id: "fair-division", date: "2026-01-24" },
  { id: "motivation", date: "2026-02-03" },
  { id: "zones", date: "2026-02-14" },
  { id: "quick-clean", date: "2026-02-22" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.bayitbeseder.com";
  const now = new Date();

  const blogPostEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${base}/blog#${post.id}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogPostEntries,
    ...uniquePosts(await getBlogPosts()).map(post => ({ url: `${base}/blog/${post.slug.current}`, lastModified: new Date(post.publishedAt!) })),
    {
      url: `${base}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
