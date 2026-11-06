import {test,expect} from 'bun:test';
import {uniquePosts, POSTS_QUERY} from '../../src/lib/sanity/client';
test('published query excludes drafts and URL dedup prefers Hebrew',()=>{
 expect(POSTS_QUERY).toContain('status == "published"'); expect(POSTS_QUERY).toContain('drafts.**');
 const posts=uniquePosts([{slug:{current:'one'},title:'English',language:'en',publishedAt:'2026-01-01'},{slug:{current:'one'},title:'עברית',language:'he',publishedAt:'2026-01-01'}]);
 expect(posts).toHaveLength(1); expect(posts[0].title).toBe('עברית');
});
