import { createClient } from "@sanity/client";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "b0hm1i34",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});

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
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    focusKeyword?: string;
  } | null;
}

const POSTS_QUERY = `*[_type == "post" && siteId == "bayit-beseder" && status == "published"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  language,
  tags,
  "mainImageUrl": mainImage.asset->url,
  "bodyText": pt::text(body),
  seo
}`;

export async function getBlogPosts(): Promise<SanityPost[]> {
  try {
    return await sanityClient.fetch<SanityPost[]>(POSTS_QUERY);
  } catch {
    return [];
  }
}
