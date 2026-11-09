import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, postUrl } from '../lib/posts';
export async function GET(context: APIContext) {
  return rss({ title: 'Fresh', description: 'Fresh 的文章与学习笔记。', site: context.site!, items: (await getPosts()).map(post => ({ title: post.data.title, description: post.data.description, pubDate: post.data.date, link: postUrl(post.id), categories: post.data.tags })), customData: '<language>zh-cn</language>' });
}
