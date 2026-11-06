import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
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
  const schema={"@context":"https://schema.org","@type":"BlogPosting",headline:article.title,description:article.description,datePublished:article.dates.published,dateModified:article.dates.modified,inLanguage:article.language,author:{"@type":article.author.type === "Organization" ? "Organization" : "Person",name:article.author.name,url:article.author.url},mainEntityOfPage:article.canonicalUrl,...(article.image ? {image:article.image.url} : {})};
  const html=sanitizeHtml(marked.parse(article.bodyMarkdown, {async:false}),{allowedTags:["p","h2","h3","h4","ul","ol","li","strong","em","a","blockquote","br"],allowedAttributes:{a:["href","title"]},allowedSchemes:["https","http","mailto"]});
  return <main dir={article.language === "he" ? "rtl" : "ltr"} lang={article.language} className="max-w-3xl mx-auto px-6 py-12"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/><nav className="mb-8"><Link className="text-primary font-semibold inline-block py-3" href="/blog">← לכל המאמרים</Link></nav><article className="card-elevated p-6 md:p-10"><header><h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{article.title}</h1><p className="text-muted text-lg leading-8">{article.description}</p><p className="text-sm text-muted mt-4">{article.author.name} · <time dateTime={article.dates.published}>{new Date(article.dates.published).toLocaleDateString("he-IL")}</time></p></header>{article.image && <img src={article.image.url} alt={article.image.alt} className="w-full rounded-2xl mt-8" />}<div className="mt-8 space-y-5 text-foreground leading-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-bold [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ms-6 [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{__html:html}} />{article.internalLinks?.length > 0 && <nav aria-label="קישורים נוספים" className="mt-8"><h2 className="text-xl font-bold">קישורים נוספים</h2><ul>{article.internalLinks.filter(link => (link.url.startsWith("/") && !link.url.startsWith("//")) || link.url.startsWith("https://")).map(link => <li key={link.url}><a className="text-primary underline inline-block py-3" href={link.url}>{link.label}</a></li>)}</ul></nav>}<p className="mt-8"><a className="text-primary underline inline-block py-3" href={article.source.url}>למאמר המקורי</a></p></article></main>;
}
