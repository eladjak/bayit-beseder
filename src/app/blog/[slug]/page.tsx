export const revalidate = 60;
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PortableText } from '@portabletext/react';
import { getBlogPosts } from '@/lib/sanity/client';

type Props = { params: Promise<{slug:string}> };
async function find(slug:string) {
  const posts=(await getBlogPosts()).filter(p=>p.slug.current===slug);
  return posts.find(p=>p.language==='he') ?? posts[0];
}
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const {slug}=await params; const post=await find(slug); if(!post) return {};
  return {title:post.seo?.metaTitle || post.title,description:post.seo?.metaDescription || post.excerpt,alternates:{canonical:`https://www.bayitbeseder.com/blog/${slug}`}};
}
export default async function ArticlePage({params}:Props) {
  const {slug}=await params; const post=await find(slug); if(!post) notFound();
  const canonical=`https://www.bayitbeseder.com/blog/${slug}`;
  const schema={'@context':'https://schema.org','@type':'BlogPosting',headline:post.title,description:post.excerpt,datePublished:post.publishedAt,inLanguage:post.language || 'he',author:{'@type':'Organization',name:'בית בסדר'},mainEntityOfPage:canonical,...(post.mainImageUrl?{image:post.mainImageUrl}:{})};
  return <main dir={post.language==='en'?'ltr':'rtl'} lang={post.language || 'he'} className="max-w-3xl mx-auto px-6 py-12"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/><nav className="mb-8"><Link className="text-primary font-semibold inline-block py-3" href="/blog">← לכל המאמרים</Link></nav><article className="card-elevated p-6 md:p-10"><header><h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{post.title}</h1><p className="text-muted text-lg leading-8">{post.excerpt}</p>{post.publishedAt && <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString('he-IL')}</time>}</header>{post.mainImageUrl && <img src={post.mainImageUrl} alt="" className="w-full rounded-2xl mt-8"/>}<div className="mt-8 space-y-5 text-foreground leading-8 [&_h2]:text-2xl [&_h2]:font-bold [&_a]:text-primary [&_a]:underline">{Array.isArray(post.body) && <PortableText value={post.body} components={{marks:{link:({children,value})=>{const href=value?.href; return typeof href==='string' && (/^https?:\/\//i.test(href)||/^\/(?!\/)/.test(href)) ? <a href={href}>{children}</a> : <>{children}</>;}}}}/>}</div></article></main>;
}
