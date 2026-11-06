import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { syndicatedArticles } from "@/lib/syndicated";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({params}:Props): Promise<Metadata> {
  const {slug} = await params;
  const article = syndicatedArticles().find(p => p.slug === slug);
  if (!article) return {};
  return { title: article.title, description: article.description, alternates: {canonical:article.canonicalUrl}, robots: article.contentMode === "reprint" || process.env.VERCEL_ENV === "preview" ? {index:false,follow:false} : undefined };
}
export default async function ArticlePage({params}:Props) {
  const {slug}=await params;
  const article=syndicatedArticles().find(p=>p.slug===slug);
  if (!article) notFound();
  const schema={"@context":"https://schema.org","@type":"BlogPosting",headline:article.title,description:article.description,datePublished:article.dates.published,dateModified:article.dates.modified,inLanguage:article.language,author:{"@type":"Organization",name:article.author.name,url:article.author.url},mainEntityOfPage:article.canonicalUrl};
  return <main dir={article.language === "he" ? "rtl" : "ltr"} lang={article.language} className="max-w-3xl mx-auto px-6 py-12"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/><nav className="mb-8"><Link className="text-primary font-semibold inline-block py-3" href="/blog">← לכל המאמרים</Link></nav><article className="card-elevated p-6 md:p-10"><header><h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{article.title}</h1><p className="text-muted text-lg leading-8">{article.description}</p><p className="text-sm text-muted mt-4">{article.author.name} · <time dateTime={article.dates.published}>{new Date(article.dates.published).toLocaleDateString("he-IL")}</time></p></header>{article.image && <img src={article.image.url} alt={article.image.alt} className="w-full rounded-2xl mt-8" />}<div className="mt-8 space-y-5 text-foreground leading-8">{article.bodyMarkdown.split(/\n\s*\n/).map((block,i)=>{if(block.startsWith("### ")) return <h3 key={i} className="text-xl font-bold pt-4">{block.slice(4)}</h3>; if(block.startsWith("## ")) return <h2 key={i} className="text-2xl font-bold pt-5">{block.slice(3)}</h2>; if(block.startsWith("> ")) return <blockquote key={i} className="border-r-4 border-primary pr-4 font-semibold">{block.slice(2)}</blockquote>; return <p key={i} className="whitespace-pre-line">{block}</p>;})}</div><p className="mt-8"><a className="text-primary underline inline-block py-3" href={article.source.url}>למאמר המקורי</a></p></article></main>;
}
