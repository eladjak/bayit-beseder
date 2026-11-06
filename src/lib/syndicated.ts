import fs from "node:fs";
import path from "node:path";

export type Article = { id:string; site:string; slug:string; language:string; title:string; description:string; bodyMarkdown:string; tags:string[]; author:{name:string;url:string;type?:"Person"|"Organization"}; dates:{published:string;modified:string}; canonicalUrl:string; source:{url:string}; image?:{url:string;alt:string}; contentMode:string; previewOnly?:boolean; internalLinks:{url:string;label:string}[]; approval:{status:string} };
export function syndicatedArticles(): Article[] {
  const directory = path.join(process.cwd(), "content/blog-syndicated");
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter(name => name.endsWith(".json")).flatMap(name => {
    const envelope = JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
    if (envelope.schemaVersion !== 1 || !Array.isArray(envelope.articles)) throw new Error(`Invalid article envelope: ${name}`);
    return (envelope.articles as Article[]).filter(article => {
      if (article.site !== "bayit" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug) || !article.title || !article.bodyMarkdown || !article.canonicalUrl?.startsWith("https://") || !article.source?.url?.startsWith("https://") || (article.image && !article.image.url.startsWith("https://")) || !article.dates?.published) throw new Error(`Invalid article: ${name}`);
      return article.approval?.status === "approved-for-blog-draft" && (!article.previewOnly || process.env.VERCEL_ENV === "preview");
    });
  });
}
export const xmlEscape = (s:string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
