import { createClient } from "@sanity/client";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "b0hm1i34",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: true,
  perspective: "published",
});

import type { PortableTextBlock } from "@portabletext/react";

export interface SanityPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string | null;
  publishedAt: string | null;
  language: string;
  tags: string[] | null;
  mainImageUrl: string | null;
  bodyText: string | null;
  body: PortableTextBlock[] | null;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    focusKeyword?: string;
  } | null;
}

export const POSTS_QUERY = `*[_type == "post" && siteId == "bayit-beseder" && status == "published" && !(_id in path("drafts.**")) && defined(slug.current) && defined(publishedAt)] | order(publishedAt desc) {
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  language,
  tags,
  "mainImageUrl": mainImage.asset->url,
  "bodyText": pt::text(body),
  body,
  seo
}`;

export async function getBlogPosts(): Promise<SanityPost[]> {
  try {
    return await sanityClient.fetch<SanityPost[]>(POSTS_QUERY);
  } catch {
    return [];
  }
}

// A URL has one canonical representation; prefer Hebrew and retain English as fallback.
export function uniquePosts(posts: SanityPost[]): SanityPost[] {
  const result = new Map<string, SanityPost>();
  for (const post of posts) {
    const slug = post.slug?.current; if (!slug) continue;
    const current = result.get(slug);
    if (!current || (current.language !== "he" && post.language === "he")) result.set(slug, post);
  }
  return [...result.values()].sort((a,b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""));
}
