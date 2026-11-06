import React from 'react';
import {test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {sanityClient,POSTS_QUERY} from '../../src/lib/sanity/client';
import ArticlePage from '../../src/app/blog/[slug]/page';
import sitemap from '../../src/app/sitemap';
import {GET as rss} from '../../src/app/rss.xml/route';
const fixture={_id:'published-fixture',title:'תכנון הבית ביחד',slug:{current:'fixture'},excerpt:'דוגמת בדיקה לתצוגת מאמר.',publishedAt:'2026-01-01',language:'he',tags:[],mainImageUrl:null,bodyText:'תכנון משותף מקל על שגרת הבית.',body:[{_type:'block',_key:'b',style:'normal',markDefs:[],children:[{_type:'span',_key:'s',marks:[],text:'תכנון משותף מקל על שגרת הבית.'}]}],seo:null};
test('fixture detail, sitemap and RSS share published-only source; draft slug 404s',async()=>{const old=sanityClient.fetch;sanityClient.fetch=async()=>[fixture];try{expect(POSTS_QUERY).toContain('status == "published"');expect(POSTS_QUERY).toContain('drafts.**');const html=renderToStaticMarkup(await ArticlePage({params:Promise.resolve({slug:'fixture'})}));expect(html).toContain('BlogPosting');expect(html).toContain(fixture.title);expect((await sitemap()).some(p=>p.url.endsWith('/blog/fixture'))).toBe(true);expect(await (await rss()).text()).toContain('/blog/fixture');await expect(ArticlePage({params:Promise.resolve({slug:'draft-fixture'})})).rejects.toThrow();}finally{sanityClient.fetch=old}});
